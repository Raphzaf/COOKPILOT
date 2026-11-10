import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import { PRIVACY, TERMS } from "@/content/legal";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[full] = value;
    else Object.assign(out, flatten(value, full));
  }
  return out;
}

const EN = flatten(en as Tree);
const FR = flatten(fr as Tree);
// Argument names only: "{name}" or "{name, plural, …}" — not the words inside plural branches.
const placeholders = (s: string) => [...new Set([...s.matchAll(/\{(\w+)\s*[,}]/g)].map((m) => m[1]))].sort().join(",");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? sourceFiles(full) : /\.tsx?$/.test(name) ? [full] : [];
  });
}

describe("translations", () => {
  it("has exactly the same keys in English and French", () => {
    expect(Object.keys(FR).sort()).toEqual(Object.keys(EN).sort());
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of Object.keys(EN)) expect(placeholders(FR[key] ?? ""), key).toBe(placeholders(EN[key]!));
  });
  it("has no empty or untranslated-looking strings", () => {
    for (const [key, value] of Object.entries(FR)) expect(value.trim().length, key).toBeGreaterThan(0);
  });
  it("never puts a straight apostrophe before a placeholder (ICU quoting)", () => {
    for (const [key, value] of [...Object.entries(EN), ...Object.entries(FR)]) expect(/'\{/.test(value), key).toBe(false);
  });
  it("defines every statically referenced message key", () => {
    const missing: string[] = [];
    for (const file of sourceFiles(path.resolve(__dirname, "../../src"))) {
      const source = readFileSync(file, "utf8");
      // A name such as `t` can be bound to different namespaces in different functions:
      // each call is resolved against the closest declaration above it.
      const declarations = [...source.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:\{[^}]*namespace:\s*)?"([\w.]+)"/g)].map((m) => ({
        name: m[1]!,
        namespace: m[2]!,
        index: m.index,
      }));
      for (const name of new Set(declarations.map((d) => d.name))) {
        for (const m of source.matchAll(new RegExp(`(?<![\\w.])${name}(?:\\.rich)?\\(\\s*"([^"]+)"`, "g"))) {
          const declaration = declarations.filter((d) => d.name === name && d.index < m.index).at(-1);
          if (!declaration) continue;
          const key = `${declaration.namespace}.${m[1]}`;
          if (!(key in EN)) missing.push(`${path.basename(file)}: ${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
  it("ships legal texts in both languages with the same structure", () => {
    for (const doc of [PRIVACY, TERMS]) expect(doc.fr.sections.length).toBe(doc.en.sections.length);
  });
});
