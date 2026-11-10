import type { Locale, Recipe, RecipeIngredient, RecipeStep, RecipeSummary } from "@/lib/domain/types";
import { LOCALES } from "@/lib/domain/types";
import type { SeedRecipe } from "@/data/seed/recipes";
import { localizeSeedRecipe } from "@/data/seed/recipes";

/** Locale-specific part of a recipe. */
export interface RecipeContent {
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  accessories: string[];
  safetyNotes: string[];
  sourceNote: string | null;
}

export type RecipeMeta = Omit<Recipe, keyof RecipeContent | "locale">;

/** Storage shape: language-neutral metadata + one content block per available locale. */
export interface RecipeRecord {
  meta: RecipeMeta;
  translations: Partial<Record<Locale, RecipeContent>>;
}

/** Picks the requested locale, falling back to whichever translation exists. */
export function materialize(record: RecipeRecord, locale: Locale): Recipe | null {
  const available = record.translations[locale] ? locale : LOCALES.find((l) => record.translations[l]);
  if (!available) return null;
  const content = record.translations[available]!;
  return { ...record.meta, ...content, locale: available };
}

export function summarize(recipe: Recipe): RecipeSummary {
  const { ingredients, steps: _steps, safetyNotes: _safetyNotes, ...rest } = recipe;
  return { ...rest, ingredientNames: ingredients.map((i) => i.name) };
}

export function seedToRecord(seed: SeedRecipe): RecipeRecord {
  const translations: RecipeRecord["translations"] = {};
  let meta: RecipeMeta | null = null;
  for (const locale of LOCALES) {
    const r = localizeSeedRecipe(seed, locale);
    const { title, description, ingredients, steps, accessories, safetyNotes, sourceNote, locale: _l, ...rest } = r;
    translations[locale] = { title, description, ingredients, steps, accessories, safetyNotes, sourceNote };
    meta = rest;
  }
  return { meta: meta!, translations };
}
