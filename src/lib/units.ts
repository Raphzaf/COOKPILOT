import type { Locale, MeasurementSystem, TemperatureUnit } from "@/lib/domain/types";

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

export function toCelsius(value: number, unit: TemperatureUnit): number {
  return unit === "C" ? value : fahrenheitToCelsius(value);
}

/** Converts a temperature between units; rounds to the nearest 5° when converting (dial precision). */
export function convertTemperature(value: number, from: TemperatureUnit, to: TemperatureUnit): number {
  if (from === to) return Math.round(value);
  const raw = from === "C" ? celsiusToFahrenheit(value) : fahrenheitToCelsius(value);
  return Math.round(raw / 5) * 5;
}

export function formatTemperature(valueC: number, unit: TemperatureUnit): string {
  return `${convertTemperature(valueC, "C", unit)} °${unit}`;
}

/** Formats a documented range without changing the documented figures when units already match. */
export function formatTemperatureRange(
  min: number | null,
  max: number | null,
  sourceUnit: TemperatureUnit | null,
  displayUnit: TemperatureUnit,
): string | null {
  if (min == null || max == null || !sourceUnit) return null;
  const a = convertTemperature(min, sourceUnit, displayUnit);
  const b = convertTemperature(max, sourceUnit, displayUnit);
  return `${a}–${b} °${displayUnit}`;
}

function round(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function trimNumber(value: number, locale: Locale, maxFractionDigits = 1): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: maxFractionDigits }).format(
    value,
  );
}

const FRACTIONS: [number, string][] = [
  [0.25, "¼"],
  [0.33, "⅓"],
  [0.5, "½"],
  [0.67, "⅔"],
  [0.75, "¾"],
];

function withFraction(value: number): string {
  const whole = Math.floor(value);
  const rest = value - whole;
  if (rest < 0.12) return String(whole || 0);
  if (rest > 0.88) return String(whole + 1);
  let best = FRACTIONS[0]!;
  for (const f of FRACTIONS) if (Math.abs(f[0] - rest) < Math.abs(best[0] - rest)) best = f;
  return whole > 0 ? `${whole} ${best[1]}` : best[1];
}

export interface FormattedQuantity {
  amount: string;
  unit: string;
}

/**
 * Formats a canonical metric quantity for display.
 * Weight → oz/lb, volume → fl oz/cups in imperial; spoons, pieces and pinches are system-neutral.
 */
export function formatQuantity(
  quantity: number | null,
  unit: string | null,
  system: MeasurementSystem,
  locale: Locale,
): FormattedQuantity | null {
  if (quantity == null) return null;
  const u = unit ?? "";
  if (system === "metric") {
    if (u === "g" && quantity >= 1000) return { amount: trimNumber(quantity / 1000, locale, 2), unit: "kg" };
    if (u === "ml" && quantity >= 1000) return { amount: trimNumber(quantity / 1000, locale, 2), unit: "l" };
    if (u === "g" || u === "ml") return { amount: trimNumber(quantity >= 20 ? round(quantity, 5) : quantity, locale), unit: u };
    return { amount: neutral(quantity, u, locale), unit: neutralUnit(u, locale, quantity) };
  }
  switch (u) {
    case "g":
    case "kg": {
      const grams = u === "kg" ? quantity * 1000 : quantity;
      const oz = grams / 28.3495;
      if (oz >= 16) return { amount: trimNumber(oz / 16, locale, 1), unit: "lb" };
      return { amount: trimNumber(oz < 2 ? round(oz, 0.25) : round(oz, 0.5), locale, 2), unit: "oz" };
    }
    case "ml":
    case "l": {
      const ml = u === "l" ? quantity * 1000 : quantity;
      const cups = ml / 236.588;
      if (cups >= 0.25) return { amount: withFraction(cups), unit: cups > 1.12 ? "cups" : "cup" };
      return { amount: trimNumber(round(ml / 29.5735, 0.5), locale, 1), unit: "fl oz" };
    }
    default:
      return { amount: neutral(quantity, u, locale), unit: neutralUnit(u, locale, quantity) };
  }
}

function neutral(quantity: number, unit: string, locale: Locale): string {
  if (unit === "tsp" || unit === "tbsp" || unit === "piece" || unit === "") {
    return Number.isInteger(quantity) ? String(quantity) : withFraction(quantity);
  }
  return trimNumber(quantity, locale);
}

const UNIT_LABELS: Record<string, Record<Locale, [string, string]>> = {
  tsp: { en: ["tsp", "tsp"], fr: ["c. à café", "c. à café"] },
  tbsp: { en: ["tbsp", "tbsp"], fr: ["c. à soupe", "c. à soupe"] },
  pinch: { en: ["pinch", "pinches"], fr: ["pincée", "pincées"] },
  piece: { en: ["", ""], fr: ["", ""] },
  clove: { en: ["clove", "cloves"], fr: ["gousse", "gousses"] },
  sprig: { en: ["sprig", "sprigs"], fr: ["brin", "brins"] },
};

function neutralUnit(unit: string, locale: Locale, quantity: number): string {
  const label = UNIT_LABELS[unit];
  if (!label) return unit;
  return quantity > 1 ? label[locale][1] : label[locale][0];
}

/** Scales a quantity from the recipe's base servings to the requested servings. */
export function scaleQuantity(quantity: number | null, baseServings: number, servings: number): number | null {
  if (quantity == null || baseServings <= 0) return quantity;
  const scaled = (quantity * servings) / baseServings;
  return Math.round(scaled * 100) / 100;
}

export function formatDuration(totalSeconds: number, locale: Locale): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  if (m > 0 && sec > 0 && m < 5) return `${m} min ${sec} s`;
  if (m > 0) return `${m} min`;
  return locale === "fr" ? `${sec} s` : `${sec} sec`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
