import { notFound } from "next/navigation";
import { CookingMode } from "@/components/cooking/cooking-mode";
import { getEntitlements } from "@/lib/billing/entitlements";
import { appPage } from "@/lib/page-context";
import { bestDeviceForRecipe } from "@/lib/recipes/compatibility";

export default async function CookingPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, user, store } = await appPage(params);
  const { id } = await params;
  const recipe = await store.getRecipeById(id, locale, user.id);
  if (!recipe) notFound();
  const [prefs, devices, { limits }] = await Promise.all([store.getPreferences(user.id), store.listUserDevices(user.id), getEntitlements(store, user.id)]);
  const best = bestDeviceForRecipe(recipe, devices);
  const usable = best && best.result.level !== "incompatible" ? best.device : null;
  const programNames: Record<string, string> = {};
  for (const cap of usable?.model.capabilities ?? []) if (cap.kind === "program") programNames[cap.key] = cap.name[locale];
  for (const key of recipe.programs) programNames[key] ??= key.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return (
    <CookingMode
      recipe={recipe}
      system={prefs.measurementSystem}
      unit={prefs.temperatureUnit}
      deviceLabel={usable ? `${usable.model.brand.name} ${usable.model.name} ${usable.model.modelNumber}` : null}
      deviceModelId={usable?.model.id ?? null}
      programNames={programNames}
      initialServings={recipe.servings}
      advanced={limits.advancedCookingMode}
    />
  );
}
