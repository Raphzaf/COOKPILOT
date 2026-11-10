import { ChefHat, SearchX, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DeleteRecipeButton } from "@/components/recipes/delete-recipe-button";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { parseRecipeFilter, RecipeFilters, type RecipeSearchParams } from "@/components/recipes/recipe-filters";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/states";
import { Link } from "@/lib/i18n/navigation";
import { appPage } from "@/lib/page-context";
import { cn } from "@/lib/utils";

export default async function LibraryPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<RecipeSearchParams> }) {
  const { locale, user, store } = await appPage(params);
  const t = await getTranslations("recipes");
  const sp = await searchParams;
  const tab = sp.tab === "mine" ? "mine" : "library";
  const categories = await store.listCategories();
  const filter = parseRecipeFilter(sp, categories);
  const [recipes, mine] = await Promise.all([store.listRecipes(locale, filter), store.listUserRecipes(user.id, locale)]);
  const tabs = [
    { key: "library", href: "/dashboard/recipes", label: t("tabs.library") },
    { key: "mine", href: "/dashboard/recipes?tab=mine", label: t("tabs.mine", { count: mine.length }) },
  ] as const;
  return (
    <>
      <PageHeader title={t("libraryTitle")} description={t("librarySubtitle")} actions={<Button asChild><Link href="/dashboard/chef"><ChefHat />{t("askChef")}</Link></Button>} />
      <div className="mb-6 inline-flex rounded-full border border-border-strong bg-surface p-1 text-sm" role="tablist">
        {tabs.map((x) => (
          <Link key={x.key} href={x.href} role="tab" aria-selected={tab === x.key} className={cn("rounded-full px-4 py-1.5", tab === x.key ? "bg-foreground text-surface" : "text-muted")}>{x.label}</Link>
        ))}
      </div>
      {tab === "library" ? (
        <>
          <RecipeFilters action="/dashboard/recipes" filter={filter} categories={categories} />
          <p className="mt-6 text-sm text-muted" data-testid="recipe-count">{t("count", { count: recipes.length })}</p>
          {recipes.length === 0 ? (
            <EmptyState className="mt-4" icon={SearchX} title={t("empty.title")} description={t("empty.description")} />
          ) : (
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recipes.map((r) => <RecipeCard key={r.id} recipe={r} href={`/dashboard/recipes/${r.id}`} />)}
            </div>
          )}
        </>
      ) : mine.length === 0 ? (
        <EmptyState icon={Sparkles} title={t("mineEmpty.title")} description={t("mineEmpty.description")} action={<Button asChild><Link href="/dashboard/chef"><ChefHat />{t("askChef")}</Link></Button>} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((r) => <RecipeCard key={r.id} recipe={r} href={`/dashboard/recipes/${r.id}`} footer={<DeleteRecipeButton id={r.id} />} />)}
        </div>
      )}
    </>
  );
}
