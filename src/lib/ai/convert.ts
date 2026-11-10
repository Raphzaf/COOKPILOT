import type { DataStore, RecipeMetaInput } from "@/lib/data/store";
import type { UserDevice } from "@/lib/domain/types";
import type { RecipeContent } from "@/lib/recipes/record";
import { toCelsius } from "@/lib/units";
import { slugify } from "@/lib/utils";
import type { ChefPayload } from "./schema";

/** Converts a validated AI recipe into the storage format of the user's personal library. */
export function chefRecipeToRecord(
  payload: ChefPayload,
  devices: UserDevice[],
  fallbackCategory: string,
  authorName: string,
): { meta: RecipeMetaInput; content: RecipeContent } | null {
  const recipe = payload.recipe;
  if (!recipe) return null;
  const device = devices.find((d) => d.model.id === recipe.deviceModelId);
  const programs = [...new Set(recipe.steps.map((s) => s.program).filter((p): p is string => Boolean(p)))];
  return {
    meta: {
      slug: slugify(recipe.title),
      coverImage: null,
      illustration: null,
      category: "main",
      cuisine: null,
      dietary: [],
      servings: recipe.servings,
      prepMinutes: recipe.prepMinutes,
      cookMinutes: recipe.cookMinutes,
      difficulty: recipe.difficulty,
      deviceCategory: device?.model.category.slug ?? fallbackCategory,
      programs,
      // A saved AI answer is never "verified": that label requires a physical test recorded by an admin.
      provenance: payload.provenance === "adapted" ? "adapted" : "generated",
      status: "private",
      authorName,
      compatibility: device ? [{ deviceModelId: device.model.id, tested: false, notes: null }] : [],
    },
    content: {
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit, note: i.note, optional: false })),
      steps: recipe.steps.map((s, index) => ({
        position: index + 1,
        instruction: s.instruction,
        program: s.program,
        level: s.level,
        temperatureC: s.temperature != null && s.temperatureUnit ? Math.round(toCelsius(s.temperature, s.temperatureUnit)) : null,
        durationSeconds: s.durationMinutes != null ? Math.round(s.durationMinutes * 60) : null,
        tip: null,
      })),
      accessories: recipe.accessories,
      safetyNotes: recipe.safetyNotes,
      sourceNote: null,
    },
  };
}

export async function fallbackDeviceCategory(store: DataStore, devices: UserDevice[]): Promise<string> {
  return devices[0]?.model.category.slug ?? (await store.listCategories())[0]?.slug ?? "air-fryer";
}
