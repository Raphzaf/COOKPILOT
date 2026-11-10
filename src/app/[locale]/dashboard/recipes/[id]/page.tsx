import { ArrowLeft, ChefHat, Play } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { DeleteRecipeButton } from "@/components/recipes/delete-recipe-button";
import { FavoriteButton, FeedbackForm } from "@/components/recipes/recipe-actions";
import { RecipeView } from "@/components/recipes/recipe-view";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
import { appPage } from "@/lib/page-context";
import { bestDeviceForRecipe } from "@/lib/recipes/compatibility";

export default async function AppRecipePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, user, store } = await appPage(params);
  const { id } = await params;
  const recipe = await store.getRecipeById(id, locale, user.id);
  if (!recipe) notFound();
  const t = await getTranslations("recipes");
  const [prefs, devices, models, favorites] = await Promise.all([
    store.getPreferences(user.id),
    store.listUserDevices(user.id),
    store.listDeviceModels(),
    store.listFavoriteIds(user.id),
  ]);
  const best = bestDeviceForRecipe(recipe, devices);
  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href="/dashboard/recipes" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft className="size-4" />{t("backToRecipes")}</Link>
        {recipe.ownerId === user.id ? <DeleteRecipeButton id={recipe.id} redirectTo="/dashboard/recipes?tab=mine" /> : null}
      </div>
      <RecipeView
        recipe={recipe}
        system={prefs.measurementSystem}
        unit={prefs.temperatureUnit}
        models={models}
        userDevices={devices}
        actions={
          <>
            <Button asChild size="lg"><Link href={`/dashboard/cooking/${recipe.id}`} data-testid="start-cooking"><Play />{t("startCooking")}</Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href={`/dashboard/chef?recipe=${recipe.id}`}><ChefHat />{t("askChef")}</Link></Button>
            <FavoriteButton recipeId={recipe.id} initial={favorites.includes(recipe.id)} />
          </>
        }
      >
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-1 text-xl">{t("feedbackTitle")}</h2>
          <p className="mb-4 text-sm text-muted">{t("feedbackSubtitle")}</p>
          <FeedbackForm recipeId={recipe.id} deviceModelId={best?.device.model.id ?? null} />
        </section>
      </RecipeView>
    </>
  );
}
