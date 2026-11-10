import type { Recipe } from "@/lib/domain/types";
import { bestDeviceForRecipe } from "@/lib/recipes/compatibility";
import { convertTemperature } from "@/lib/units";
import type { ChefContext, LLMProvider, LLMRequest, LLMStreamEvent } from "./provider";
import type { ChefRecipe, ChefResponse } from "./schema";

/**
 * Library-only fallback used when no LLM API key is configured.
 *
 * It does NOT generate anything: it returns the best matching library recipe for the user's
 * appliances (or says it has none) and labels the answer as a demo. This keeps the chat usable
 * in demo mode without ever pretending an AI model answered.
 */

const TEXT = {
  en: {
    intro: "Demo answer — no AI model is connected yet, so I searched the CookPilot library instead of generating a recipe.",
    noDevice: "Add your appliance in “My appliances” first, and I will match recipes to its exact programs.",
    found: (title: string, device: string) => `The closest match for your ${device} is “${title}”. It is a demonstration recipe that has not been physically tested, so check doneness as you go.`,
    foundNoDevice: (title: string) => `The closest match in the library is “${title}”. None of your registered appliances is listed as compatible, so treat the settings as a guide only.`,
    none: "I could not find a library recipe for that request. Once an AI provider is configured, I will be able to build one for your appliance.",
    gap: "No AI provider is configured (GEMINI_API_KEY missing): answers are limited to the recipe library.",
    which: "Which of your appliances would you like to use?",
    follow: ["How do I adapt this for more people?", "What can I serve with it?"],
    addDevice: "Which appliance do you own?",
  },
  fr: {
    intro: "Réponse de démonstration — aucun modèle d'IA n'est encore connecté : j'ai cherché dans la bibliothèque CookPilot au lieu de générer une recette.",
    noDevice: "Ajoutez d'abord votre appareil dans « Mes appareils » : j'adapterai les recettes à ses programmes exacts.",
    found: (title: string, device: string) => `La recette la plus proche pour votre ${device} est « ${title} ». C'est une recette de démonstration qui n'a pas été testée physiquement : surveillez la cuisson.`,
    foundNoDevice: (title: string) => `La recette la plus proche dans la bibliothèque est « ${title} ». Aucun de vos appareils enregistrés n'est indiqué comme compatible : considérez les réglages comme indicatifs.`,
    none: "Je n'ai pas trouvé de recette correspondante dans la bibliothèque. Dès qu'un fournisseur d'IA sera configuré, je pourrai en composer une pour votre appareil.",
    gap: "Aucun fournisseur d'IA n'est configuré (GEMINI_API_KEY manquante) : les réponses se limitent à la bibliothèque de recettes.",
    which: "Lequel de vos appareils souhaitez-vous utiliser ?",
    follow: ["Comment adapter cette recette pour plus de personnes ?", "Avec quoi la servir ?"],
    addDevice: "Quel appareil possédez-vous ?",
  },
} as const;

export function libraryRecipeToChef(recipe: Recipe, deviceModelId: string | null, unit: "C" | "F"): ChefRecipe {
  const units = new Set(["g", "kg", "ml", "l", "tsp", "tbsp", "piece", "pinch", "clove", "sprig"]);
  return {
    title: recipe.title,
    description: recipe.description,
    servings: recipe.servings,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    difficulty: recipe.difficulty,
    deviceModelId,
    basedOnRecipeId: recipe.id,
    ingredients: recipe.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit && units.has(i.unit) ? (i.unit as ChefRecipe["ingredients"][number]["unit"]) : null,
      note: i.note,
    })),
    steps: recipe.steps.map((s) => ({
      instruction: s.instruction,
      program: s.program,
      level: s.level,
      temperature: s.temperatureC != null ? convertTemperature(s.temperatureC, "C", unit) : null,
      temperatureUnit: s.temperatureC != null ? unit : null,
      durationMinutes: s.durationSeconds != null ? Math.round((s.durationSeconds / 60) * 10) / 10 : null,
    })),
    accessories: recipe.accessories,
    safetyNotes: recipe.safetyNotes,
  };
}

export function buildLibraryAnswer(ctx: ChefContext): ChefResponse {
  const t = TEXT[ctx.locale];
  const candidates = [...(ctx.focusRecipe ? [ctx.focusRecipe] : []), ...ctx.recipes];

  if (ctx.devices.length === 0 && candidates.length === 0) {
    return {
      reply: `${t.intro}\n\n${t.noDevice}`,
      needsClarification: true,
      clarifyingQuestions: [t.addDevice],
      provenance: "none",
      knowledgeGap: t.gap,
      recipe: null,
      followUps: [],
    };
  }

  let chosen: { recipe: Recipe; deviceId: string | null; deviceLabel: string | null } | null = null;
  for (const recipe of candidates) {
    const best = bestDeviceForRecipe(recipe, ctx.devices);
    if (best && (best.result.level === "tested" || best.result.level === "compatible")) {
      chosen = { recipe, deviceId: best.device.model.id, deviceLabel: `${best.device.model.brand.name} ${best.device.model.modelNumber}` };
      break;
    }
  }
  if (!chosen && candidates[0] && ctx.devices.length === 0) chosen = { recipe: candidates[0], deviceId: null, deviceLabel: null };
  if (!chosen && ctx.focusRecipe) chosen = { recipe: ctx.focusRecipe, deviceId: null, deviceLabel: null };

  if (!chosen) {
    return {
      reply: `${t.intro}\n\n${t.none}`,
      needsClarification: false,
      clarifyingQuestions: [],
      provenance: "none",
      knowledgeGap: t.gap,
      recipe: null,
      followUps: [],
    };
  }

  return {
    reply: `${t.intro}\n\n${chosen.deviceLabel ? t.found(chosen.recipe.title, chosen.deviceLabel) : t.foundNoDevice(chosen.recipe.title)}`,
    needsClarification: false,
    clarifyingQuestions: [],
    provenance: chosen.recipe.provenance === "verified" ? "verified" : "adapted",
    knowledgeGap: t.gap,
    recipe: libraryRecipeToChef(chosen.recipe, chosen.deviceId, ctx.preferences.temperatureUnit),
    followUps: [...t.follow],
  };
}

export const libraryProvider: LLMProvider = {
  id: "library",
  model: "library-search",
  isLLM: false,
  async *streamStructured(request: LLMRequest): AsyncIterable<LLMStreamEvent> {
    const json = JSON.stringify(buildLibraryAnswer(request.context));
    for (let i = 0; i < json.length; i += 48) yield { type: "text", text: json.slice(i, i + 48) };
    yield { type: "usage", inputTokens: 0, outputTokens: 0 };
  },
  async embed() {
    return null;
  },
};
