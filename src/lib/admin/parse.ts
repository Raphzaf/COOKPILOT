import type { DeviceCapability, DeviceSource, DeviceSpec, I18nText, RecipeIngredient, RecipeStep } from "@/lib/domain/types";
import { slugify } from "@/lib/utils";

/**
 * Line-based formats used by the admin forms. One item per line, fields separated by "|".
 * Empty fields mean "not documented" and are stored as null — never as a guess.
 */

const cells = (line: string) => line.split("|").map((c) => c.trim());
const lines = (text: string) => text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
const num = (value: string | undefined): number | null => {
  if (!value) return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** kind | key | name EN | name FR | min | max | unit | levels (comma separated) | note EN | note FR */
export function parseCapabilities(text: string): Omit<DeviceCapability, "id">[] {
  return lines(text).map((line) => {
    const [kind, key, en, fr, min, max, unit, levels, noteEn, noteFr] = cells(line);
    const k = kind === "accessory" || kind === "feature" ? kind : "program";
    const name: I18nText = { en: en || key || "", fr: fr || en || key || "" };
    const tempMin = num(min);
    const tempMax = num(max);
    const hasRange = tempMin != null && tempMax != null && (unit === "C" || unit === "F");
    return {
      kind: k,
      key: slugify(key || en || ""),
      name,
      tempMin: hasRange ? tempMin : null,
      tempMax: hasRange ? tempMax : null,
      tempUnit: hasRange ? (unit as "C" | "F") : null,
      levels: levels ? levels.split(",").map((l) => l.trim()).filter(Boolean) : [],
      notes: noteEn ? { en: noteEn, fr: noteFr || noteEn } : null,
    };
  }).filter((c) => c.key);
}

export function formatCapabilities(caps: Omit<DeviceCapability, "id">[]): string {
  return caps
    .map((c) => [c.kind, c.key, c.name.en, c.name.fr, c.tempMin ?? "", c.tempMax ?? "", c.tempUnit ?? "", c.levels.join(","), c.notes?.en ?? "", c.notes?.fr ?? ""].join(" | "))
    .join("\n");
}

/** title | url | kind (manufacturer, manual, retailer, other) */
export function parseSources(text: string, accessedAt: string): Omit<DeviceSource, "id">[] {
  return lines(text)
    .map((line) => {
      const [title, url, kind] = cells(line);
      const k = kind === "manufacturer" || kind === "manual" || kind === "retailer" ? kind : "other";
      return { title: title ?? "", url: url ?? "", kind: k as DeviceSource["kind"], accessedAt };
    })
    .filter((s) => s.title && /^https:\/\//i.test(s.url));
}

export function formatSources(sources: Omit<DeviceSource, "id">[]): string {
  return sources.map((s) => [s.title, s.url, s.kind].join(" | ")).join("\n");
}

/** key | label EN | label FR | value */
export function parseSpecs(text: string): DeviceSpec[] {
  return lines(text)
    .map((line) => {
      const [key, en, fr, value] = cells(line);
      return { key: slugify(key ?? ""), label: { en: en || key || "", fr: fr || en || key || "" }, value: value ?? "" };
    })
    .filter((s) => s.key && s.value);
}

export function formatSpecs(specs: DeviceSpec[]): string {
  return specs.map((s) => [s.key, s.label.en, s.label.fr, s.value].join(" | ")).join("\n");
}

/** EN | FR */
export function parseI18nLines(text: string): I18nText[] {
  return lines(text)
    .map((line) => {
      const [en, fr] = cells(line);
      return { en: en ?? "", fr: fr || en || "" };
    })
    .filter((t) => t.en);
}

export function formatI18nLines(items: I18nText[]): string {
  return items.map((i) => `${i.en} | ${i.fr}`).join("\n");
}

/** quantity | unit | name | note | optional(yes) */
export function parseIngredients(text: string): RecipeIngredient[] {
  return lines(text)
    .map((line) => {
      const [quantity, unit, name, note, optional] = cells(line);
      return { quantity: num(quantity), unit: unit || null, name: name ?? "", note: note || null, optional: /^(yes|oui|true|1)$/i.test(optional ?? "") };
    })
    .filter((i) => i.name);
}

export function formatIngredients(items: RecipeIngredient[]): string {
  return items.map((i) => [i.quantity ?? "", i.unit ?? "", i.name, i.note ?? "", i.optional ? "yes" : ""].join(" | ")).join("\n");
}

/** instruction | program key | level | temperature °C | duration seconds | tip */
export function parseSteps(text: string): RecipeStep[] {
  return lines(text)
    .map((line, index) => {
      const [instruction, program, level, temp, seconds, tip] = cells(line);
      const duration = num(seconds);
      return {
        position: index + 1,
        instruction: instruction ?? "",
        program: program ? slugify(program) : null,
        level: level || null,
        temperatureC: num(temp),
        durationSeconds: duration != null ? Math.max(0, Math.round(duration)) : null,
        tip: tip || null,
      };
    })
    .filter((s) => s.instruction);
}

export function formatSteps(steps: RecipeStep[]): string {
  return steps.map((s) => [s.instruction, s.program ?? "", s.level ?? "", s.temperatureC ?? "", s.durationSeconds ?? "", s.tip ?? ""].join(" | ")).join("\n");
}

export const parseLines = (text: string): string[] => lines(text);
