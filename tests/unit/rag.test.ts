import { describe, expect, it } from "vitest";
import { parseCapabilities, parseIngredients, parseSources, parseSteps, formatCapabilities, formatSteps } from "@/lib/admin/parse";
import { buildSeedKnowledge } from "@/data/seed/knowledge";
import { toTsQuery } from "@/lib/data/supabase-store";
import type { KnowledgeChunk } from "@/lib/domain/types";
import { chunkText, contentHash, extractText } from "@/lib/rag/chunk";
import { lexicalSearch, tokenize } from "@/lib/rag/lexical";
import { recipeIdsFromChunks } from "@/lib/rag/retrieve";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

const corpus: KnowledgeChunk[] = buildSeedKnowledge().flatMap((doc, d) =>
  chunkText(doc.content).map((content, position) => ({
    id: `${d}-${position}`,
    documentId: String(d),
    position,
    content,
    manufacturer: doc.manufacturer,
    modelNumber: doc.modelNumber,
    language: doc.language,
    docType: doc.docType,
    verificationStatus: doc.verificationStatus,
    documentTitle: doc.title,
    sourceUrl: doc.sourceUrl,
  })),
);

describe("text extraction and chunking", () => {
  it("cleans raw text", () => {
    expect(extractText("a\r\nb   c\n\n\n\n<p>d</p>\u0000")).toBe("a\nb c\n\nd");
  });
  it("keeps short documents whole and splits long ones under the limit", () => {
    expect(chunkText("One paragraph.\n\nAnother one.")).toHaveLength(1);
    const long = Array.from({ length: 40 }, (_, i) => `Paragraph ${i} explains something useful about cooking at home.`).join("\n\n");
    const chunks = chunkText(long, { maxChars: 300, overlapChars: 40 });
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.every((c) => c.length <= 300)).toBe(true);
    expect(chunks.join(" ")).toContain("Paragraph 39");
    expect(chunkText("x".repeat(2500), { maxChars: 500 }).every((c) => c.length <= 500)).toBe(true);
    expect(chunkText("   ")).toEqual([]);
  });
  it("hashes content deterministically", () => {
    expect(contentHash("abc")).toBe(contentHash("abc"));
    expect(contentHash("abc")).not.toBe(contentHash("abd"));
    expect(contentHash("abc")).toHaveLength(64);
  });
});

describe("retrieval", () => {
  it("tokenises without stop words or accents", () => {
    expect(tokenize("Comment faire une crème glacée ?")).toEqual(["creme", "glacee"]);
  });
  it("finds food-safety guidance", () => {
    const top = lexicalSearch("safe internal temperature for chicken", corpus, { language: "en" }, 3);
    expect(top[0]?.docType).toBe("food_safety");
    expect(top[0]?.content).toContain("74 °C");
  });
  it("filters by language and by the user's models", () => {
    const fr = lexicalSearch("programmes air fry", corpus, { language: "fr", modelNumbers: ["AF101"] }, 8);
    expect(fr.length).toBeGreaterThan(0);
    expect(fr.every((c) => c.language === "fr")).toBe(true);
    expect(fr.every((c) => c.modelNumber === null || c.modelNumber === "AF101")).toBe(true);
    expect(lexicalSearch("zzzz qqqq", corpus, { language: "en" }, 5)).toEqual([]);
  });
  it("surfaces library recipes with their ids", () => {
    const hits = lexicalSearch("mango lime sorbet", corpus, { language: "en", modelNumbers: ["NC301"] }, 4);
    expect(recipeIdsFromChunks(hits)).toHaveLength(1);
  });
  it("builds safe prefix tsqueries for Postgres", () => {
    expect(toTsQuery("Grilled steaks & crème!")).toBe("grilled:* | steak:* | crème:*");
    expect(toTsQuery("'); drop table x; --")).toBe("drop:* | table:*");
    expect(toTsQuery("a of")).toBe("");
  });
});

describe("rate limiter", () => {
  it("allows up to the limit then blocks until the window slides", () => {
    resetRateLimits();
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 1000, 1000 + i).allowed).toBe(true);
    const blocked = rateLimit("k", 3, 1000, 1500);
    expect(blocked).toMatchObject({ allowed: false, remaining: 0 });
    expect(blocked.retryAfterSeconds).toBe(1);
    expect(rateLimit("k", 3, 1000, 2100).allowed).toBe(true);
    expect(rateLimit("other", 3, 1000, 1500).allowed).toBe(true);
  });
});

describe("admin line formats", () => {
  it("parses capabilities and never invents missing ranges", () => {
    const caps = parseCapabilities("program | Air Fry | Air Fry | Air Fry | 105 | 400 | F\nprogram | grill | Grill | Grill | | | | LOW,MED,HIGH\nfeature | sync | Sync | Sync\nprogram | bake | Bake | Cuire | 150 | | C");
    expect(caps[0]).toMatchObject({ kind: "program", key: "air-fry", tempMin: 105, tempMax: 400, tempUnit: "F" });
    expect(caps[1]).toMatchObject({ key: "grill", tempMin: null, tempUnit: null, levels: ["LOW", "MED", "HIGH"] });
    expect(caps[2]?.kind).toBe("feature");
    expect(caps[3]).toMatchObject({ tempMin: null, tempMax: null, tempUnit: null });
    expect(parseCapabilities(formatCapabilities(caps))).toEqual(caps);
  });
  it("only accepts https sources", () => {
    const sources = parseSources("Manual | https://example.com/m.pdf | manual\nBad | javascript:alert(1) | other\nNo url", "2026-01-01");
    expect(sources).toEqual([{ title: "Manual", url: "https://example.com/m.pdf", kind: "manual", accessedAt: "2026-01-01" }]);
  });
  it("round-trips ingredients and steps", () => {
    expect(parseIngredients("500 | g | Potatoes | peeled\n | | Salt | to taste\n0,5 | tsp | Paprika | | yes")).toEqual([
      { quantity: 500, unit: "g", name: "Potatoes", note: "peeled", optional: false },
      { quantity: null, unit: null, name: "Salt", note: "to taste", optional: false },
      { quantity: 0.5, unit: "tsp", name: "Paprika", note: null, optional: true },
    ]);
    const steps = parseSteps("Preheat | Air Fry | | 200 | 180\nServe");
    expect(steps[0]).toMatchObject({ position: 1, program: "air-fry", temperatureC: 200, durationSeconds: 180 });
    expect(steps[1]).toMatchObject({ position: 2, program: null, temperatureC: null });
    expect(parseSteps(formatSteps(steps))).toEqual(steps);
  });
});
