import { describe, expect, it } from "vitest";
import { convertTemperature, formatClock, formatDuration, formatQuantity, formatTemperature, formatTemperatureRange, scaleQuantity } from "@/lib/units";

describe("temperature", () => {
  it("converts and rounds to dial precision", () => {
    expect(convertTemperature(200, "C", "F")).toBe(390);
    expect(convertTemperature(400, "F", "C")).toBe(205);
    expect(convertTemperature(180, "C", "C")).toBe(180);
    expect(formatTemperature(74, "F")).toBe("165 °F");
  });
  it("formats documented ranges and refuses to invent missing ones", () => {
    expect(formatTemperatureRange(105, 400, "F", "F")).toBe("105–400 °F");
    expect(formatTemperatureRange(105, 400, "F", "C")).toBe("40–205 °C");
    expect(formatTemperatureRange(null, null, null, "C")).toBeNull();
    expect(formatTemperatureRange(100, null, "C", "C")).toBeNull();
  });
});

describe("quantities", () => {
  it("scales with servings", () => {
    expect(scaleQuantity(500, 2, 4)).toBe(1000);
    expect(scaleQuantity(1, 2, 3)).toBe(1.5);
    expect(scaleQuantity(null, 2, 4)).toBeNull();
  });
  it("formats metric", () => {
    expect(formatQuantity(1500, "g", "metric", "en")).toEqual({ amount: "1.5", unit: "kg" });
    expect(formatQuantity(1500, "g", "metric", "fr")).toEqual({ amount: "1,5", unit: "kg" });
    expect(formatQuantity(240, "ml", "metric", "en")).toEqual({ amount: "240", unit: "ml" });
    expect(formatQuantity(null, null, "metric", "en")).toBeNull();
  });
  it("formats imperial", () => {
    expect(formatQuantity(500, "g", "imperial", "en")).toEqual({ amount: "1.1", unit: "lb" });
    expect(formatQuantity(240, "ml", "imperial", "en")).toEqual({ amount: "1", unit: "cup" });
    expect(formatQuantity(30, "g", "imperial", "en")?.unit).toBe("oz");
  });
  it("keeps spoons and pieces system-neutral and localised", () => {
    expect(formatQuantity(0.5, "tsp", "imperial", "en")).toEqual({ amount: "½", unit: "tsp" });
    expect(formatQuantity(2, "tbsp", "metric", "fr")).toEqual({ amount: "2", unit: "c. à soupe" });
    expect(formatQuantity(4, "piece", "metric", "en")).toEqual({ amount: "4", unit: "" });
  });
});

describe("time", () => {
  it("formats durations and clocks", () => {
    expect(formatDuration(720, "en")).toBe("12 min");
    expect(formatDuration(86400, "fr")).toBe("24 h");
    expect(formatDuration(45, "en")).toBe("45 sec");
    expect(formatClock(605)).toBe("10:05");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(-3)).toBe("0:00");
  });
});
