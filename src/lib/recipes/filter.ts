import type { RecipeFilter, RecipeSummary } from "@/lib/domain/types";
import { normalizeText } from "@/lib/utils";

/** Pure, testable recipe filtering shared by the demo store and the Supabase store. */
export function filterRecipes(recipes: RecipeSummary[], filter: RecipeFilter): RecipeSummary[] {
  const query = filter.query ? normalizeText(filter.query) : "";
  const wanted = (filter.ingredients ?? []).map(normalizeText).filter(Boolean);
  return recipes.filter((recipe) => {
    if (filter.deviceCategory && recipe.deviceCategory !== filter.deviceCategory) return false;
    if (filter.deviceModelId && !recipe.compatibility.some((c) => c.deviceModelId === filter.deviceModelId)) return false;
    if (filter.category && recipe.category !== filter.category) return false;
    if (filter.difficulty && recipe.difficulty !== filter.difficulty) return false;
    if (filter.maxTotalMinutes != null && recipe.prepMinutes + recipe.cookMinutes > filter.maxTotalMinutes) return false;
    if (filter.diet && !recipe.dietary.includes(filter.diet)) return false;
    const names = recipe.ingredientNames.map(normalizeText);
    if (wanted.length > 0 && !wanted.every((w) => names.some((n) => n.includes(w)))) return false;
    if (query) {
      const haystack = normalizeText([recipe.title, recipe.description, recipe.cuisine ?? "", ...recipe.ingredientNames].join(" "));
      if (!query.split(/\s+/).every((term) => haystack.includes(term))) return false;
    }
    return true;
  });
}

export const RECIPE_CATEGORIES = ["main", "side", "starter", "dessert", "breakfast", "snack"] as const;
export const DIETS = ["vegetarian", "vegan", "gluten-free", "dairy-free", "pescatarian"] as const;
export const TIME_OPTIONS = [15, 30, 45, 60] as const;
