import { describe, expect, it } from "vitest";
import { DEVICE_IDS, SEED_DEVICES } from "@/data/seed/devices";
import { localizeSeedRecipe, SEED_RECIPES } from "@/data/seed/recipes";
import type { DeviceModel, UserDevice } from "@/lib/domain/types";
import { bestDeviceForRecipe, checkCompatibility } from "@/lib/recipes/compatibility";
import { filterRecipes } from "@/lib/recipes/filter";
import { materialize, seedToRecord, summarize } from "@/lib/recipes/record";

const model = (id: string): DeviceModel => SEED_DEVICES.find((d) => d.id === id)!;
const recipe = (slug: string) => localizeSeedRecipe(SEED_RECIPES.find((r) => r.slug === slug)!, "en");
const all = SEED_RECIPES.map((s) => summarize(localizeSeedRecipe(s, "en")));
const own = (id: string): UserDevice => ({ id: `ud-${id}`, userId: "u", modelId: id, nickname: null, isFavorite: false, addedAt: "", model: model(id) });

describe("seed integrity", () => {
  it("never labels untested content as verified", () => {
    for (const seed of SEED_RECIPES) {
      expect(seed.provenance).not.toBe("verified");
      for (const locale of ["en", "fr"] as const) {
        const r = localizeSeedRecipe(seed, locale);
        expect(r.isDemo).toBe(true);
        expect(r.compatibility.every((c) => !c.tested)).toBe(true);
        expect(r.title.length).toBeGreaterThan(3);
        expect(r.steps.length).toBeGreaterThan(1);
      }
    }
    expect(SEED_DEVICES.every((d) => d.verificationStatus !== "verified")).toBe(true);
  });
  it("only references documented programs on compatible models", () => {
    for (const seed of SEED_RECIPES) {
      const r = localizeSeedRecipe(seed, "en");
      for (const id of seed.compatibleModelIds) {
        const result = checkCompatibility(r, model(id));
        expect(result, `${seed.slug} on ${model(id).modelNumber}`).toMatchObject({ level: "compatible", missingPrograms: [], temperatureOutOfRange: false });
      }
    }
  });
  it("gives every model at least one source and flags incomplete ones", () => {
    for (const d of SEED_DEVICES) {
      expect(d.sources.length).toBeGreaterThan(0);
      if (d.capabilities.filter((c) => c.kind === "program").length === 0) expect(d.verificationStatus).toBe("incomplete");
      if (d.verificationStatus !== "documented") expect(d.missingInfo.length).toBeGreaterThan(0);
    }
  });
});

describe("device compatibility", () => {
  it("rejects a different appliance category", () => {
    expect(checkCompatibility(recipe("mango-lime-sorbet"), model(DEVICE_IDS.af101)).level).toBe("incompatible");
  });
  it("does not assume a similar model shares capabilities", () => {
    // AG301EU has no documented program, unlike the US AG301.
    const steak = recipe("grilled-ribeye-steak");
    expect(checkCompatibility(steak, model(DEVICE_IDS.ag301)).level).toBe("compatible");
    expect(checkCompatibility(steak, model(DEVICE_IDS.ag301eu))).toMatchObject({ level: "partial", missingPrograms: ["grill"] });
    expect(checkCompatibility(recipe("vanilla-bean-ice-cream"), model(DEVICE_IDS.nc501)).level).toBe("partial");
  });
  it("flags temperatures beyond the documented range", () => {
    const hot = recipe("crispy-potato-wedges");
    hot.steps = hot.steps.map((s) => (s.temperatureC ? { ...s, temperatureC: 230 } : s));
    expect(checkCompatibility(hot, model(DEVICE_IDS.af101))).toMatchObject({ level: "partial", temperatureOutOfRange: true });
    // 400 °F ≈ 204 °C: 200 °C is inside the range.
    expect(checkCompatibility(recipe("crispy-potato-wedges"), model(DEVICE_IDS.af101)).temperatureOutOfRange).toBe(false);
  });
  it("reports 'tested' only when recorded for that exact model", () => {
    const r = recipe("lemon-dill-salmon");
    r.compatibility = [{ deviceModelId: DEVICE_IDS.af101, tested: true, notes: null }];
    expect(checkCompatibility(r, model(DEVICE_IDS.af101)).level).toBe("tested");
    expect(checkCompatibility(r, model(DEVICE_IDS.af300eu)).level).toBe("compatible");
  });
  it("picks the user's best appliance", () => {
    const best = bestDeviceForRecipe(recipe("vanilla-bean-ice-cream"), [own(DEVICE_IDS.af101), own(DEVICE_IDS.nc301)]);
    expect(best?.device.modelId).toBe(DEVICE_IDS.nc301);
    expect(bestDeviceForRecipe(recipe("vanilla-bean-ice-cream"), [])).toBeNull();
  });
});

describe("recipe filtering", () => {
  it("filters by appliance category and model", () => {
    expect(filterRecipes(all, { deviceCategory: "air-fryer" })).toHaveLength(4);
    expect(filterRecipes(all, { deviceModelId: DEVICE_IDS.nc300eu }).map((r) => r.slug).sort()).toEqual(["mango-lime-sorbet", "vanilla-bean-ice-cream"]);
    expect(filterRecipes(all, { deviceModelId: DEVICE_IDS.nc501 })).toHaveLength(0);
  });
  it("filters by category, difficulty, time and diet", () => {
    expect(filterRecipes(all, { category: "dessert" })).toHaveLength(2);
    expect(filterRecipes(all, { difficulty: "medium" }).map((r) => r.slug)).toEqual(["grilled-ribeye-steak"]);
    expect(filterRecipes(all, { maxTotalMinutes: 15 }).every((r) => r.prepMinutes + r.cookMinutes <= 15)).toBe(true);
    expect(filterRecipes(all, { diet: "vegan" }).map((r) => r.slug).sort()).toEqual(["crispy-potato-wedges", "grilled-vegetable-skewers", "mango-lime-sorbet"]);
  });
  it("filters by ingredients (all must match, accent-insensitive)", () => {
    expect(filterRecipes(all, { ingredients: ["chicken"] }).map((r) => r.slug)).toEqual(["lemon-herb-chicken-thighs"]);
    expect(filterRecipes(all, { ingredients: ["lemon", "salmon"] }).map((r) => r.slug)).toEqual(["lemon-dill-salmon"]);
    expect(filterRecipes(all, { ingredients: ["chicken", "mango"] })).toHaveLength(0);
    const fr = SEED_RECIPES.map((s) => summarize(localizeSeedRecipe(s, "fr")));
    expect(filterRecipes(fr, { ingredients: ["creme"] }).map((r) => r.slug)).toEqual(["vanilla-bean-ice-cream"]);
  });
  it("searches free text and combines filters", () => {
    expect(filterRecipes(all, { query: "ribeye" })).toHaveLength(1);
    expect(filterRecipes(all, { query: "crispy", deviceCategory: "indoor-grill" })).toHaveLength(0);
    expect(filterRecipes(all, {})).toHaveLength(SEED_RECIPES.length);
  });
});

describe("translations", () => {
  it("falls back to an available locale", () => {
    const record = seedToRecord(SEED_RECIPES[0]!);
    delete record.translations.fr;
    expect(materialize(record, "fr")?.locale).toBe("en");
    expect(materialize({ ...record, translations: {} }, "en")).toBeNull();
  });
});
