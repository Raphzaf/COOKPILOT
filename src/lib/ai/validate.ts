import type { DeviceCapability, Locale } from "@/lib/domain/types";
import { toCelsius } from "@/lib/units";
import { normalizeText, slugify } from "@/lib/utils";
import type { ChefContext } from "./provider";
import type { ChefRecipe, ChefResponse, ChefWarning } from "./schema";

/**
 * Deterministic guard-rails applied to every AI answer AFTER schema validation.
 * The model is never trusted on appliance facts: anything that is not backed by the
 * catalogue is removed and reported as a warning, instead of being shown as a setting.
 */

interface SafetyRule {
  key: string;
  keywords: string[];
  /** Marker that proves an equivalent note already exists. */
  marker: string;
  note: Record<Locale, string>;
}

const SAFETY_RULES: SafetyRule[] = [
  {
    key: "poultry",
    keywords: ["chicken", "poulet", "turkey", "dinde", "duck", "canard", "poultry", "volaille"],
    marker: "74",
    note: {
      en: "Cook poultry until the thickest part reaches 74 °C (165 °F), checked with a thermometer.",
      fr: "Cuisez la volaille jusqu'à ce que la partie la plus épaisse atteigne 74 °C (165 °F), vérifiés au thermomètre.",
    },
  },
  {
    key: "ground",
    keywords: ["minced", "mince", "ground beef", "ground pork", "ground meat", "hache", "burger", "sausage", "saucisse", "merguez"],
    marker: "71",
    note: {
      en: "Cook minced meat, burgers and sausages to 71 °C (160 °F) in the centre.",
      fr: "Cuisez la viande hachée, les burgers et les saucisses à 71 °C (160 °F) à cœur.",
    },
  },
  {
    key: "fish",
    keywords: ["salmon", "saumon", "fish", "poisson", "cod", "cabillaud", "tuna", "thon", "shrimp", "prawn", "crevette", "trout", "truite"],
    marker: "63",
    note: {
      en: "Food-safety agencies recommend cooking fish and seafood to 63 °C (145 °F).",
      fr: "Les agences de sécurité alimentaire recommandent de cuire poissons et fruits de mer à 63 °C (145 °F).",
    },
  },
  {
    key: "whole-cuts",
    keywords: ["steak", "beef", "boeuf", "bœuf", "ribeye", "entrecote", "pork", "porc", "lamb", "agneau", "veal", "veau"],
    marker: "63",
    note: {
      en: "Food-safety agencies recommend 63 °C (145 °F) plus a 3-minute rest for whole cuts of beef, pork, veal and lamb. Cooking below that is a personal choice.",
      fr: "Les agences de sécurité alimentaire recommandent 63 °C (145 °F) suivis de 3 minutes de repos pour les pièces entières de bœuf, porc, veau et agneau. Une cuisson inférieure relève d'un choix personnel.",
    },
  },
];

const ALLERGEN_SYNONYMS: Record<string, string[]> = {
  milk: ["milk", "lait", "butter", "beurre", "cream", "creme", "cheese", "fromage", "yogurt", "yaourt", "dairy"],
  dairy: ["milk", "lait", "butter", "beurre", "cream", "creme", "cheese", "fromage", "yogurt", "yaourt"],
  lait: ["milk", "lait", "butter", "beurre", "cream", "creme", "cheese", "fromage", "yogurt", "yaourt"],
  lactose: ["milk", "lait", "butter", "beurre", "cream", "creme", "cheese", "fromage", "yogurt", "yaourt"],
  gluten: ["flour", "farine", "bread", "pain", "pasta", "pates", "wheat", "ble", "breadcrumb", "chapelure", "couscous", "semolina", "semoule"],
  egg: ["egg", "oeuf", "œuf", "mayonnaise"],
  eggs: ["egg", "oeuf", "œuf", "mayonnaise"],
  oeuf: ["egg", "oeuf", "œuf", "mayonnaise"],
  oeufs: ["egg", "oeuf", "œuf", "mayonnaise"],
  nuts: ["nut", "noix", "almond", "amande", "hazelnut", "noisette", "pistachio", "pistache", "cashew", "cajou", "pecan", "walnut"],
  "fruits a coque": ["nut", "noix", "almond", "amande", "hazelnut", "noisette", "pistachio", "pistache", "cashew", "cajou", "pecan"],
  peanut: ["peanut", "cacahuete", "arachide"],
  peanuts: ["peanut", "cacahuete", "arachide"],
  arachide: ["peanut", "cacahuete", "arachide"],
  fish: ["fish", "poisson", "salmon", "saumon", "cod", "cabillaud", "tuna", "thon", "anchovy", "anchois"],
  poisson: ["fish", "poisson", "salmon", "saumon", "cod", "cabillaud", "tuna", "thon", "anchovy", "anchois"],
  shellfish: ["shrimp", "prawn", "crevette", "crab", "crabe", "lobster", "homard", "mussel", "moule"],
  soy: ["soy", "soja", "tofu", "edamame"],
  soja: ["soy", "soja", "tofu", "edamame"],
  sesame: ["sesame", "tahini"],
};

function findProgram(programs: DeviceCapability[], value: string): DeviceCapability | undefined {
  const wanted = slugify(value);
  return programs.find((p) => p.key === wanted || slugify(p.name.en) === wanted || slugify(p.name.fr) === wanted);
}

function matchesAllergy(allergy: string, ingredient: string): boolean {
  const a = normalizeText(allergy);
  const name = normalizeText(ingredient);
  if (!a) return false;
  if (name.includes(a)) return true;
  return (ALLERGEN_SYNONYMS[a] ?? []).some((s) => name.includes(normalizeText(s)));
}

export function validateChefResponse(raw: ChefResponse, ctx: ChefContext): { response: ChefResponse; warnings: ChefWarning[] } {
  const warnings: ChefWarning[] = [];
  const warn = (code: ChefWarning["code"], detail: string) => {
    if (!warnings.some((w) => w.code === code && w.detail === detail)) warnings.push({ code, detail });
  };

  if (!raw.recipe) {
    return { response: { ...raw, provenance: "none", clarifyingQuestions: raw.needsClarification ? raw.clarifyingQuestions : [] }, warnings };
  }

  const recipe: ChefRecipe = structuredClone(raw.recipe);

  // 1 — the appliance must be one the user actually owns.
  let device = recipe.deviceModelId ? ctx.devices.find((d) => d.model.id === recipe.deviceModelId) : undefined;
  if (recipe.deviceModelId && !device) {
    warn("unknown_device_removed", recipe.deviceModelId);
    recipe.deviceModelId = null;
  }
  if (!device && ctx.devices.length === 1 && recipe.steps.some((s) => s.program)) {
    device = ctx.devices[0];
    recipe.deviceModelId = device!.model.id;
  }

  const programs = device ? device.model.capabilities.filter((c) => c.kind === "program") : [];
  const label = device ? `${device.model.brand.name} ${device.model.modelNumber}` : "";
  if (device && programs.length === 0) warn("undocumented_device", label);

  // 2 — programs, levels and temperatures must be backed by the catalogue.
  for (const step of recipe.steps) {
    if (step.temperature != null && !step.temperatureUnit) step.temperatureUnit = ctx.preferences.temperatureUnit;
    if (step.temperature == null) step.temperatureUnit = null;

    if (!step.program) {
      step.level = null;
      continue;
    }
    const capability = device ? findProgram(programs, step.program) : undefined;
    if (!capability) {
      if (device && programs.length > 0) warn("unsupported_program_removed", step.program);
      step.program = null;
      step.level = null;
      // A temperature tied to a program we cannot confirm would be an invented setting.
      if (device) {
        step.temperature = null;
        step.temperatureUnit = null;
      }
      continue;
    }
    step.program = capability.key;

    if (step.level) {
      const level = capability.levels.find((l) => l.toLowerCase() === step.level!.toLowerCase());
      step.level = level ?? null;
    }

    if (step.temperature != null && step.temperatureUnit) {
      if (capability.tempMax != null && capability.tempUnit) {
        const valueC = toCelsius(step.temperature, step.temperatureUnit);
        const maxC = toCelsius(capability.tempMax, capability.tempUnit);
        const minC = capability.tempMin != null ? toCelsius(capability.tempMin, capability.tempUnit) : -Infinity;
        if (valueC > maxC + 3 || valueC < minC - 3) {
          warn("temperature_out_of_range_removed", `${capability.name[ctx.locale]}: ${step.temperature} °${step.temperatureUnit}`);
          step.temperature = null;
          step.temperatureUnit = null;
        }
      } else if (capability.levels.length > 0) {
        // Level-based program: a figure in degrees is not a documented setting.
        warn("temperature_out_of_range_removed", `${capability.name[ctx.locale]}: ${step.temperature} °${step.temperatureUnit}`);
        step.temperature = null;
        step.temperatureUnit = null;
      } else {
        warn("undocumented_device", `${label} · ${capability.name[ctx.locale]}`);
      }
    }
  }

  // 3 — provenance can only be claimed when the evidence exists.
  const known = [...ctx.recipes, ...(ctx.focusRecipe ? [ctx.focusRecipe] : [])];
  const base = recipe.basedOnRecipeId ? known.find((r) => r.id === recipe.basedOnRecipeId) : undefined;
  if (recipe.basedOnRecipeId && !base) recipe.basedOnRecipeId = null;

  let provenance = raw.provenance;
  const verifiedAllowed =
    !!base &&
    base.provenance === "verified" &&
    !!device &&
    base.compatibility.some((c) => c.deviceModelId === device!.model.id && c.tested);
  if (provenance === "verified" && !verifiedAllowed) provenance = base ? "adapted" : "generated";
  if (provenance === "adapted" && !base) provenance = "generated";
  if (provenance === "none") provenance = base ? "adapted" : "generated";
  if (provenance !== raw.provenance && raw.provenance !== "none") warn("provenance_downgraded", `${raw.provenance} → ${provenance}`);

  // 4 — food-safety notes are guaranteed, whatever the model wrote.
  const ingredientText = normalizeText(recipe.ingredients.map((i) => i.name).join(" | "));
  const notesText = () => recipe.safetyNotes.join(" ");
  for (const rule of SAFETY_RULES) {
    if (!rule.keywords.some((k) => ingredientText.includes(normalizeText(k)))) continue;
    if (notesText().includes(rule.marker)) continue;
    if (recipe.safetyNotes.length < 10) {
      recipe.safetyNotes.push(rule.note[ctx.locale]);
      warn("safety_note_added", rule.key);
    }
  }

  // 5 — allergies declared by the user.
  for (const allergy of ctx.preferences.allergies) {
    for (const ingredient of recipe.ingredients) {
      if (matchesAllergy(allergy, ingredient.name)) warn("allergen_match", `${allergy}: ${ingredient.name}`);
    }
  }

  return {
    response: { ...raw, recipe, provenance, needsClarification: false, clarifyingQuestions: [] },
    warnings,
  };
}
