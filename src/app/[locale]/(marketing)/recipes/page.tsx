import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { parseRecipeFilter, RecipeFilters, type RecipeSearchParams } from "@/components/recipes/recipe-filters";
import { EmptyState, Notice } from "@/components/ui/states";
import { getPublicStore } from "@/lib/data";
import { asLocale } from "@/lib/i18n/locale";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "recipes" });
  return buildMetadata({ locale, path: "/recipes", title: t("metaTitle"), description: t("metaDescription") });
}

export default async function RecipesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<RecipeSearchParams> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("recipes");
  const store = getPublicStore();
  const categories = await store.listCategories();
  const filter = parseRecipeFilter(await searchParams, categories);
  const recipes = await store.listRecipes(locale, filter);
  return (
    <div className="container-page py-14">
      <p className="eyebrow mb-3">{t("eyebrow")}</p>
      <h1 className="text-5xl md:text-6xl">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">{t("subtitle")}</p>
      {recipes.some((r) => r.isDemo) ? <Notice tone="warning" className="mt-6 max-w-3xl">{t("demoNotice")}</Notice> : null}
      <div className="mt-8"><RecipeFilters action="/recipes" filter={filter} categories={categories} /></div>
      <p className="mt-6 text-sm text-muted" aria-live="polite" data-testid="recipe-count">{t("count", { count: recipes.length })}</p>
      {recipes.length === 0 ? (
        <EmptyState className="mt-4" icon={SearchX} title={t("empty.title")} description={t("empty.description")} />
      ) : (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} href={`/recipes/${recipe.slug}`} />)}
        </div>
      )}
    </div>
  );
}
