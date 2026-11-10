import { z } from "zod";

/** Structured answer the AI Chef must produce. Validated with Zod before anything reaches the user. */

const trimmed = (max: number) => z.string().trim().max(max);

export const chefIngredientSchema = z.object({
  name: trimmed(120).min(1),
  quantity: z.number().positive().max(100000).nullable(),
  unit: z.enum(["g", "kg", "ml", "l", "tsp", "tbsp", "piece", "pinch", "clove", "sprig"]).nullable(),
  note: trimmed(160).nullable(),
});

export const chefStepSchema = z.object({
  instruction: trimmed(900).min(1),
  /** Program KEY from the user's appliance sheet (e.g. "air-fry"), or null for prep steps. */
  program: trimmed(40).nullable(),
  /** Level name for level-based appliances (e.g. "HIGH"), otherwise null. */
  level: trimmed(20).nullable(),
  temperature: z.number().min(-30).max(600).nullable(),
  temperatureUnit: z.enum(["C", "F"]).nullable(),
  durationMinutes: z.number().min(0).max(2880).nullable(),
});

export const chefRecipeSchema = z.object({
  title: trimmed(120).min(1),
  description: trimmed(500),
  servings: z.number().int().min(1).max(24),
  prepMinutes: z.number().int().min(0).max(1440),
  cookMinutes: z.number().int().min(0).max(2880),
  difficulty: z.enum(["easy", "medium", "advanced"]),
  /** id of the user's appliance model this recipe is written for. */
  deviceModelId: trimmed(60).nullable(),
  /** id of a library recipe this answer is adapted from, when applicable. */
  basedOnRecipeId: trimmed(60).nullable(),
  ingredients: z.array(chefIngredientSchema).min(1).max(40),
  steps: z.array(chefStepSchema).min(1).max(30),
  accessories: z.array(trimmed(120)).max(12),
  safetyNotes: z.array(trimmed(400)).max(10),
});

export const chefResponseSchema = z.object({
  reply: trimmed(4000).min(1),
  needsClarification: z.boolean(),
  clarifyingQuestions: z.array(trimmed(240)).max(4),
  provenance: z.enum(["verified", "adapted", "generated", "none"]),
  /** Set when the knowledge base lacks what is needed to answer precisely. */
  knowledgeGap: trimmed(500).nullable(),
  recipe: chefRecipeSchema.nullable(),
  followUps: z.array(trimmed(160)).max(4),
});

export type ChefIngredient = z.infer<typeof chefIngredientSchema>;
export type ChefStep = z.infer<typeof chefStepSchema>;
export type ChefRecipe = z.infer<typeof chefRecipeSchema>;
export type ChefResponse = z.infer<typeof chefResponseSchema>;

export interface ChefSource {
  title: string;
  url: string | null;
  docType: string;
}

/** What is stored with an assistant message and rendered by the chat UI. */
export interface ChefPayload extends ChefResponse {
  warnings: ChefWarning[];
  sources: ChefSource[];
  provider: string;
  /** True when no LLM is configured and the answer was assembled from the library only. */
  demoAnswer: boolean;
}

export type ChefWarningCode =
  | "unsupported_program_removed"
  | "temperature_out_of_range_removed"
  | "unknown_device_removed"
  | "provenance_downgraded"
  | "allergen_match"
  | "undocumented_device"
  | "safety_note_added";

export interface ChefWarning {
  code: ChefWarningCode;
  detail: string;
}

export const chatRequestSchema = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  message: z.string().trim().min(1).max(2000),
  locale: z.enum(["en", "fr"]),
  /** Optional recipe the user is asking about (recipe page / cooking mode "Ask the chef"). */
  recipeId: z.string().uuid().nullable().optional(),
});

/**
 * JSON schema in the OpenAPI subset accepted by Gemini's `responseSchema`.
 * Kept next to the Zod schema so the two evolve together (see tests/unit/ai-schema.test.ts).
 */
const S = (description: string, nullable = false) => ({ type: "STRING", description, nullable });
const N = (description: string, nullable = false) => ({ type: "NUMBER", description, nullable });

export const chefResponseJsonSchema = {
  type: "OBJECT",
  properties: {
    reply: S("Conversational answer in the user's language. Plain text with short paragraphs. Never repeat the full recipe here."),
    needsClarification: { type: "BOOLEAN", description: "True when you must ask the user something before giving a recipe." },
    clarifyingQuestions: { type: "ARRAY", items: { type: "STRING" }, description: "Up to 3 short questions. Empty when none." },
    provenance: {
      type: "STRING",
      enum: ["verified", "adapted", "generated", "none"],
      description: "verified = context recipe marked physically tested on the exact model; adapted = adapted from a context recipe; generated = your own untested recommendation; none = no recipe.",
    },
    knowledgeGap: S("What the knowledge base does not cover for this request, or null.", true),
    recipe: {
      type: "OBJECT",
      nullable: true,
      properties: {
        title: S("Recipe title"),
        description: S("One or two sentences"),
        servings: { type: "INTEGER" },
        prepMinutes: { type: "INTEGER" },
        cookMinutes: { type: "INTEGER" },
        difficulty: { type: "STRING", enum: ["easy", "medium", "advanced"] },
        deviceModelId: S("id of the user's appliance this is written for, copied from the context", true),
        basedOnRecipeId: S("id of the context recipe this is adapted from, or null", true),
        ingredients: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name: S("Ingredient name"),
              quantity: N("Metric quantity, or null for 'to taste'", true),
              unit: { type: "STRING", enum: ["g", "kg", "ml", "l", "tsp", "tbsp", "piece", "pinch", "clove", "sprig"], nullable: true },
              note: S("Short preparation note, or null", true),
            },
            required: ["name", "quantity", "unit", "note"],
          },
        },
        steps: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              instruction: S("One clear action"),
              program: S("Program KEY from the appliance sheet, or null. Never a program the appliance does not list.", true),
              level: S("Level name (e.g. HIGH) for level-based appliances, else null", true),
              temperature: N("Temperature inside the documented range, or null when not documented", true),
              temperatureUnit: { type: "STRING", enum: ["C", "F"], nullable: true },
              durationMinutes: N("Duration of this step in minutes, or null", true),
            },
            required: ["instruction", "program", "level", "temperature", "temperatureUnit", "durationMinutes"],
          },
        },
        accessories: { type: "ARRAY", items: { type: "STRING" } },
        safetyNotes: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: ["title", "description", "servings", "prepMinutes", "cookMinutes", "difficulty", "deviceModelId", "basedOnRecipeId", "ingredients", "steps", "accessories", "safetyNotes"],
    },
    followUps: { type: "ARRAY", items: { type: "STRING" }, description: "Up to 3 short follow-up questions the user might ask next." },
  },
  required: ["reply", "needsClarification", "clarifyingQuestions", "provenance", "knowledgeGap", "recipe", "followUps"],
} as const;
