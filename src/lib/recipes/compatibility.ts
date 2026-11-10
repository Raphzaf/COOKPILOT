import type { DeviceModel, Recipe, RecipeSummary, UserDevice } from "@/lib/domain/types";
import { toCelsius } from "@/lib/units";

export type CompatibilityLevel = "tested" | "compatible" | "partial" | "incompatible";

export interface CompatibilityResult {
  level: CompatibilityLevel;
  /** Program keys the recipe needs that are not documented on the model. */
  missingPrograms: string[];
  /** True when a step asks for a temperature above the documented maximum. */
  temperatureOutOfRange: boolean;
}

type RecipeLike = Pick<RecipeSummary, "deviceCategory" | "programs" | "compatibility"> & Partial<Pick<Recipe, "steps">>;

/**
 * Decides how a recipe relates to one exact appliance model.
 *
 *  - tested:       an admin recorded a physical test on this exact model.
 *  - compatible:   same category, every required program is documented on the model and
 *                  no step exceeds a documented temperature limit.
 *  - partial:      same category but a program is missing/undocumented or a temperature
 *                  is out of range — the recipe needs adapting.
 *  - incompatible: different appliance category.
 *
 * Capabilities are never inferred from similar model names.
 */
export function checkCompatibility(recipe: RecipeLike, model: DeviceModel): CompatibilityResult {
  if (recipe.deviceCategory !== model.category.slug) {
    return { level: "incompatible", missingPrograms: recipe.programs, temperatureOutOfRange: false };
  }
  const programs = new Map(model.capabilities.filter((c) => c.kind === "program").map((c) => [c.key, c]));
  const missingPrograms = recipe.programs.filter((p) => !programs.has(p));

  let temperatureOutOfRange = false;
  for (const step of recipe.steps ?? []) {
    if (!step.program || step.temperatureC == null) continue;
    const cap = programs.get(step.program);
    if (!cap || cap.tempMax == null || !cap.tempUnit) continue;
    const maxC = toCelsius(cap.tempMax, cap.tempUnit);
    const minC = cap.tempMin != null ? toCelsius(cap.tempMin, cap.tempUnit) : -Infinity;
    // 3 °C tolerance absorbs °F/°C rounding (e.g. 400 °F = 204.4 °C).
    if (step.temperatureC > maxC + 3 || step.temperatureC < minC - 3) temperatureOutOfRange = true;
  }

  const entry = recipe.compatibility.find((c) => c.deviceModelId === model.id);
  if (missingPrograms.length > 0 || temperatureOutOfRange) return { level: "partial", missingPrograms, temperatureOutOfRange };
  if (entry?.tested) return { level: "tested", missingPrograms, temperatureOutOfRange };
  return { level: "compatible", missingPrograms, temperatureOutOfRange };
}

const ORDER: Record<CompatibilityLevel, number> = { tested: 3, compatible: 2, partial: 1, incompatible: 0 };

/** Best match among the user's appliances, or null when they own none. */
export function bestDeviceForRecipe(
  recipe: RecipeLike,
  devices: UserDevice[],
): { device: UserDevice; result: CompatibilityResult } | null {
  let best: { device: UserDevice; result: CompatibilityResult } | null = null;
  for (const device of devices) {
    const result = checkCompatibility(recipe, device.model);
    if (!best || ORDER[result.level] > ORDER[best.result.level]) best = { device, result };
  }
  return best;
}
