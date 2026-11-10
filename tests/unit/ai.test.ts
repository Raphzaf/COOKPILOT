import { beforeEach, describe, expect, it } from "vitest";
import { DEVICE_IDS, SEED_DEVICES } from "@/data/seed/devices";
import { localizeSeedRecipe, SEED_RECIPES } from "@/data/seed/recipes";
import { runChef, type ChefEvent } from "@/lib/ai/chef";
import { chefRecipeToRecord } from "@/lib/ai/convert";
import { buildLibraryAnswer } from "@/lib/ai/library-provider";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import type { ChefContext, LLMProvider } from "@/lib/ai/provider";
import { chefResponseJsonSchema, chefResponseSchema, type ChefPayload, type ChefResponse } from "@/lib/ai/schema";
import { JsonStringFieldStream, parseJsonLoose } from "@/lib/ai/stream-json";
import { validateChefResponse } from "@/lib/ai/validate";
import { demoStore, resetDemoDb, setDemoPlan } from "@/lib/data/demo-store";
import { DEFAULT_PREFERENCES, type SessionUser, type UserDevice } from "@/lib/domain/types";
import { resetRateLimits } from "@/lib/rate-limit";

const own = (id: string): UserDevice => ({ id: `ud-${id}`, userId: "u", modelId: id, nickname: null, isFavorite: false, addedAt: "", model: SEED_DEVICES.find((d) => d.id === id)! });
const seedRecipe = (slug: string) => localizeSeedRecipe(SEED_RECIPES.find((r) => r.slug === slug)!, "en");

function ctx(patch: Partial<ChefContext> = {}): ChefContext {
  return { locale: "en", displayName: null, preferences: { ...DEFAULT_PREFERENCES }, personalized: false, devices: [own(DEVICE_IDS.af101)], retrieved: [], recipes: [], focusRecipe: null, ...patch };
}

function response(patch: Partial<NonNullable<ChefResponse["recipe"]>> = {}, top: Partial<ChefResponse> = {}): ChefResponse {
  return {
    reply: "Here you go.",
    needsClarification: false,
    clarifyingQuestions: [],
    provenance: "generated",
    knowledgeGap: null,
    followUps: [],
    recipe: {
      title: "Roast potatoes",
      description: "",
      servings: 2,
      prepMinutes: 5,
      cookMinutes: 20,
      difficulty: "easy",
      deviceModelId: DEVICE_IDS.af101,
      basedOnRecipeId: null,
      ingredients: [{ name: "Potatoes", quantity: 500, unit: "g", note: null }],
      steps: [{ instruction: "Cook.", program: "air-fry", level: null, temperature: 200, temperatureUnit: "C", durationMinutes: 20 }],
      accessories: [],
      safetyNotes: [],
      ...patch,
    },
    ...top,
  };
}

describe("structured output schema", () => {
  it("accepts a valid answer and rejects malformed ones", () => {
    expect(chefResponseSchema.safeParse(response()).success).toBe(true);
    expect(chefResponseSchema.safeParse({ reply: "hi" }).success).toBe(false);
    expect(chefResponseSchema.safeParse(response({ servings: 0 })).success).toBe(false);
    expect(chefResponseSchema.safeParse(response({ steps: [] })).success).toBe(false);
    expect(chefResponseSchema.safeParse({ ...response(), provenance: "official" }).success).toBe(false);
  });
  it("keeps the provider JSON schema aligned with the Zod schema", () => {
    const zodKeys = Object.keys(chefResponseSchema.shape).sort();
    expect(Object.keys(chefResponseJsonSchema.properties).sort()).toEqual(zodKeys);
    expect([...chefResponseJsonSchema.required].sort()).toEqual(zodKeys);
    const recipeKeys = Object.keys(chefResponseSchema.shape.recipe.unwrap().shape).sort();
    expect(Object.keys(chefResponseJsonSchema.properties.recipe.properties).sort()).toEqual(recipeKeys);
  });
});

describe("appliance guard-rails", () => {
  it("keeps supported programs and in-range temperatures", () => {
    const { response: out, warnings } = validateChefResponse(response(), ctx());
    expect(out.recipe?.steps[0]).toMatchObject({ program: "air-fry", temperature: 200 });
    expect(warnings).toHaveLength(0);
  });
  it("normalises program names to catalogue keys", () => {
    const { response: out } = validateChefResponse(response({ steps: [{ instruction: "x", program: "Air Fry", level: null, temperature: 180, temperatureUnit: "C", durationMinutes: 5 }] }), ctx());
    expect(out.recipe?.steps[0]?.program).toBe("air-fry");
  });
  it("removes programs the model does not have (AF101 has no Max Crisp or Bake)", () => {
    const { response: out, warnings } = validateChefResponse(response({ steps: [{ instruction: "x", program: "max-crisp", level: null, temperature: 240, temperatureUnit: "C", durationMinutes: 5 }] }), ctx());
    expect(out.recipe?.steps[0]).toMatchObject({ program: null, temperature: null });
    expect(warnings.map((w) => w.code)).toContain("unsupported_program_removed");
  });
  it("removes temperatures above the documented maximum (400 °F on AF101)", () => {
    const { response: out, warnings } = validateChefResponse(response({ steps: [{ instruction: "x", program: "air-fry", level: null, temperature: 450, temperatureUnit: "F", durationMinutes: 5 }] }), ctx());
    expect(out.recipe?.steps[0]).toMatchObject({ program: "air-fry", temperature: null, temperatureUnit: null });
    expect(warnings.map((w) => w.code)).toContain("temperature_out_of_range_removed");
  });
  it("refuses invented degrees on level-based programs and invalid levels", () => {
    const grill = ctx({ devices: [own(DEVICE_IDS.ag301)] });
    const { response: out, warnings } = validateChefResponse(
      response({ deviceModelId: DEVICE_IDS.ag301, steps: [
        { instruction: "a", program: "grill", level: "high", temperature: 260, temperatureUnit: "C", durationMinutes: 4 },
        { instruction: "b", program: "grill", level: "TURBO", temperature: null, temperatureUnit: null, durationMinutes: 4 },
      ] }),
      grill,
    );
    expect(out.recipe?.steps[0]).toMatchObject({ program: "grill", level: "HIGH", temperature: null });
    expect(out.recipe?.steps[1]?.level).toBeNull();
    expect(warnings.map((w) => w.code)).toContain("temperature_out_of_range_removed");
  });
  it("strips every program for a model with no documented program", () => {
    const { response: out, warnings } = validateChefResponse(
      response({ deviceModelId: DEVICE_IDS.ag301eu, steps: [{ instruction: "x", program: "grill", level: "HIGH", temperature: null, temperatureUnit: null, durationMinutes: 4 }] }),
      ctx({ devices: [own(DEVICE_IDS.ag301eu)] }),
    );
    expect(out.recipe?.steps[0]).toMatchObject({ program: null, level: null });
    expect(warnings.map((w) => w.code)).toContain("undocumented_device");
  });
  it("rejects appliances the user does not own", () => {
    const { response: out, warnings } = validateChefResponse(response({ deviceModelId: DEVICE_IDS.nc301, steps: [{ instruction: "x", program: null, level: null, temperature: null, temperatureUnit: null, durationMinutes: null }] }), ctx());
    expect(out.recipe?.deviceModelId).toBeNull();
    expect(warnings.map((w) => w.code)).toContain("unknown_device_removed");
  });
});

describe("provenance and safety", () => {
  it("never lets the model claim 'verified' without a tested source recipe", () => {
    const { response: out, warnings } = validateChefResponse(response({}, { provenance: "verified" }), ctx());
    expect(out.provenance).toBe("generated");
    expect(warnings.map((w) => w.code)).toContain("provenance_downgraded");
  });
  it("downgrades 'verified' to 'adapted' when based on an untested library recipe", () => {
    const base = seedRecipe("crispy-potato-wedges");
    const { response: out } = validateChefResponse(response({ basedOnRecipeId: base.id }, { provenance: "verified" }), ctx({ recipes: [base] }));
    expect(out.provenance).toBe("adapted");
  });
  it("allows 'verified' only for a verified recipe tested on the exact model", () => {
    const base = { ...seedRecipe("crispy-potato-wedges"), provenance: "verified" as const, compatibility: [{ deviceModelId: DEVICE_IDS.af101, tested: true, notes: null }] };
    expect(validateChefResponse(response({ basedOnRecipeId: base.id }, { provenance: "verified" }), ctx({ recipes: [base] })).response.provenance).toBe("verified");
    const other = ctx({ recipes: [base], devices: [own(DEVICE_IDS.af300eu)] });
    expect(validateChefResponse(response({ basedOnRecipeId: base.id, deviceModelId: DEVICE_IDS.af300eu }, { provenance: "verified" }), other).response.provenance).toBe("adapted");
  });
  it("drops unknown source recipes and 'adapted' claims without a source", () => {
    const { response: out } = validateChefResponse(response({ basedOnRecipeId: "00000000-0000-4000-8000-000000000000" }, { provenance: "adapted" }), ctx());
    expect(out.recipe?.basedOnRecipeId).toBeNull();
    expect(out.provenance).toBe("generated");
  });
  it("adds the safe internal temperature for poultry in the user's language", () => {
    const fr = ctx({ locale: "fr" });
    const { response: out, warnings } = validateChefResponse(response({ ingredients: [{ name: "Blancs de poulet", quantity: 2, unit: "piece", note: null }] }), fr);
    expect(out.recipe?.safetyNotes.join(" ")).toContain("74 °C");
    expect(warnings.map((w) => w.code)).toContain("safety_note_added");
    const again = validateChefResponse(out, fr);
    expect(again.response.recipe?.safetyNotes).toHaveLength(out.recipe!.safetyNotes.length);
  });
  it("flags declared allergens, including synonyms", () => {
    const { warnings } = validateChefResponse(
      response({ ingredients: [{ name: "Butter", quantity: 30, unit: "g", note: null }, { name: "Peanut oil", quantity: 1, unit: "tbsp", note: null }] }),
      ctx({ preferences: { ...DEFAULT_PREFERENCES, allergies: ["milk", "Peanuts"] } }),
    );
    expect(warnings.filter((w) => w.code === "allergen_match")).toHaveLength(2);
  });
  it("normalises answers without a recipe", () => {
    const { response: out } = validateChefResponse(response({}, { recipe: null, provenance: "generated", needsClarification: true, clarifyingQuestions: ["Which cut?"] }), ctx());
    expect(out).toMatchObject({ provenance: "none", clarifyingQuestions: ["Which cut?"] });
  });
});

describe("system prompt", () => {
  it("contains the user's appliances and nothing from other models", () => {
    const prompt = buildSystemPrompt(ctx({ locale: "fr", preferences: { ...DEFAULT_PREFERENCES, allergies: ["arachide"], cuisines: ["thai"] } }));
    expect(prompt).toContain("AF101");
    expect(prompt).toContain("air-fry");
    expect(prompt).toContain("105–400 °F");
    expect(prompt).not.toContain("AF300EU");
    expect(prompt).toContain("Always answer in French");
    expect(prompt).toContain("arachide");
    expect(prompt).not.toContain("thai"); // tastes are a Pro (personalised) feature
    expect(buildSystemPrompt(ctx({ personalized: true, preferences: { ...DEFAULT_PREFERENCES, cuisines: ["thai"] } }))).toContain("thai");
  });
  it("tells the model when nothing is documented", () => {
    expect(buildSystemPrompt(ctx({ devices: [own(DEVICE_IDS.ag301eu)] }))).toContain("NONE DOCUMENTED");
    expect(buildSystemPrompt(ctx({ devices: [] }))).toContain("has not registered any appliance");
  });
});

describe("streaming JSON helpers", () => {
  it("extracts a string field across arbitrary chunk boundaries", () => {
    const json = JSON.stringify({ reply: 'Line one.\n"Quoted" and a \\ backslash — été ✓', needsClarification: false });
    for (const size of [1, 2, 3, 7, 50]) {
      const stream = new JsonStringFieldStream("reply");
      let out = "";
      for (let i = 0; i < json.length; i += size) out += stream.push(json.slice(i, i + size));
      expect(out).toBe('Line one.\n"Quoted" and a \\ backslash — été ✓');
    }
  });
  it("decodes unicode escapes and ignores other fields", () => {
    const stream = new JsonStringFieldStream("reply");
    expect(stream.push('{"other":"x","reply":"caf\\u00e9","z":"ignored"}')).toBe("café");
    expect(stream.push('"reply":"again"')).toBe("");
  });
  it("parses fenced or wrapped JSON", () => {
    expect(parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonLoose('Sure! {"a":2} hope it helps')).toEqual({ a: 2 });
    expect(() => parseJsonLoose("not json")).toThrow();
  });
});

describe("library fallback (no AI key)", () => {
  it("returns a compatible library recipe labelled as adapted, never verified", () => {
    const answer = buildLibraryAnswer(ctx({ recipes: [seedRecipe("mango-lime-sorbet"), seedRecipe("crispy-potato-wedges")] }));
    expect(answer.recipe?.title).toBe("Crispy paprika potato wedges");
    expect(answer.recipe?.deviceModelId).toBe(DEVICE_IDS.af101);
    expect(answer.provenance).toBe("adapted");
    expect(answer.knowledgeGap).toContain("GEMINI_API_KEY");
    expect(chefResponseSchema.safeParse(answer).success).toBe(true);
  });
  it("says so when nothing matches", () => {
    const answer = buildLibraryAnswer(ctx({ recipes: [seedRecipe("mango-lime-sorbet")] }));
    expect(answer.recipe).toBeNull();
    expect(answer.provenance).toBe("none");
  });
});

describe("chef orchestration and quotas", () => {
  const user = (id: string): SessionUser => ({ id, email: "t@example.com", isDemo: true, profile: { id, email: "t@example.com", displayName: null, role: "user", locale: "en", onboarded: true, createdAt: "" } });
  const collect = async (gen: AsyncGenerator<ChefEvent>) => {
    const events: ChefEvent[] = [];
    for await (const e of gen) events.push(e);
    return events;
  };
  const ask = (u: SessionUser, message: string, conversationId: string | null = null, provider?: LLMProvider) =>
    collect(runChef({ user: u, store: demoStore, locale: "en", message, conversationId, recipeId: null, provider }));

  beforeEach(() => {
    resetDemoDb();
    resetRateLimits();
  });

  it("answers from the library, persists the conversation and meters usage", async () => {
    const u = user("demo-a");
    await demoStore.addUserDevice(u.id, DEVICE_IDS.af101, null);
    const events = await ask(u, "crispy potato wedges with paprika");
    const final = events.at(-1);
    expect(events[0]?.type).toBe("meta");
    expect(events.some((e) => e.type === "delta")).toBe(true);
    if (final?.type !== "final") throw new Error(`expected final, got ${JSON.stringify(final)}`);
    const payload = final.message.payload as ChefPayload;
    expect(payload.demoAnswer).toBe(true);
    expect(payload.recipe?.title).toContain("potato");
    expect(payload.provenance).toBe("adapted");
    expect(final.quota).toMatchObject({ limit: 5, used: 1, remaining: 4 });
    const conversation = await demoStore.getConversation(u.id, final.message.conversationId);
    expect(conversation?.messages.map((m) => m.role)).toEqual(["user", "assistant"]);

    const saved = chefRecipeToRecord(payload, await demoStore.listUserDevices(u.id), "air-fryer", "Chef");
    expect(saved?.meta).toMatchObject({ status: "private", deviceCategory: "air-fryer", provenance: "adapted" });
    expect(saved?.content.steps.find((s) => s.program === "air-fry")?.temperatureC).toBe(200);
  });

  it("enforces the monthly quota server-side (5 on Free, 60 on Pro)", async () => {
    const u = user("demo-b");
    await demoStore.addUserDevice(u.id, DEVICE_IDS.af101, null);
    for (let i = 0; i < 5; i++) {
      resetRateLimits();
      expect((await ask(u, "crispy potato wedges")).at(-1)?.type).toBe("final");
    }
    resetRateLimits();
    const blocked = await ask(u, "crispy potato wedges");
    expect(blocked).toEqual([{ type: "error", code: "QUOTA_EXCEEDED" }]);
    setDemoPlan(u.id, "pro");
    expect((await ask(u, "crispy potato wedges")).at(-1)?.type).toBe("final");
  });

  it("rate-limits bursts", async () => {
    const u = user("demo-c");
    setDemoPlan(u.id, "pro");
    const results = [];
    for (let i = 0; i < 9; i++) results.push((await ask(u, "hello")).at(-1));
    expect(results.at(-1)).toMatchObject({ type: "error", code: "RATE_LIMITED" });
  });

  it("refuses conversations owned by someone else", async () => {
    const a = user("demo-d");
    const b = user("demo-e");
    const first = (await ask(a, "hello")).at(-1);
    if (first?.type !== "final") throw new Error("setup failed");
    expect(await ask(b, "hello", first.message.conversationId)).toEqual([{ type: "error", code: "NOT_FOUND" }]);
  });

  it("discards invalid model output without charging a generation", async () => {
    const u = user("demo-f");
    const broken: LLMProvider = {
      id: "fake", model: "fake", isLLM: true,
      async *streamStructured() { yield { type: "text", text: '{"reply": "oops"' }; yield { type: "usage", inputTokens: 10, outputTokens: 5 }; },
      async embed() { return null; },
    };
    expect((await ask(u, "hello", null, broken)).at(-1)).toEqual({ type: "error", code: "INVALID_RESPONSE" });
    expect(await demoStore.countUsage(u.id, "recipe_generation", "2000-01-01")).toBe(0);
    expect(await demoStore.countUsage(u.id, "chef_message", "2000-01-01")).toBe(1);
  });

  it("applies guard-rails to real provider output", async () => {
    const u = user("demo-g");
    await demoStore.addUserDevice(u.id, DEVICE_IDS.af101, null);
    const fake: LLMProvider = {
      id: "fake", model: "fake", isLLM: true,
      async *streamStructured() {
        yield { type: "text", text: JSON.stringify(response({ steps: [{ instruction: "Blast it.", program: "max-crisp", level: null, temperature: 240, temperatureUnit: "C", durationMinutes: 8 }] }, { provenance: "verified" })) };
        yield { type: "usage", inputTokens: 1000, outputTokens: 500 };
      },
      async embed() { return null; },
    };
    const final = (await ask(u, "fries", null, fake)).at(-1);
    if (final?.type !== "final") throw new Error("expected final");
    const payload = final.message.payload as ChefPayload;
    expect(payload.provenance).toBe("generated");
    expect(payload.recipe?.steps[0]).toMatchObject({ program: null, temperature: null });
    expect(payload.warnings.map((w) => w.code)).toEqual(expect.arrayContaining(["unsupported_program_removed", "provenance_downgraded"]));
  });
});
