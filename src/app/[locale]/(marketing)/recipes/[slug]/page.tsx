import { ArrowLeft, ChefHat, Play } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { RecipeView } from "@/components/recipes/recipe-view";
import { Button } from "@/components/ui/button";
import { getPublicStore } from "@/lib/data";
import type { Recipe } from "@/lib/domain/types";
import { asLocale } from "@/lib/i18n/locale";
import { Link } from "@/lib/i18n/navigation";
import { routing } from "@/lib/i18n/routing";
import { absoluteUrl, buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  const recipes = await getPublicStore().listRecipes("en").catch(() => []);
  return routing.locales.flatMap((locale) => recipes.map((r) => ({ locale, slug: r.slug })));
}

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = asLocale(raw);
  const recipe = await getPublicStore().getRecipeBySlug(slug, locale);
  if (!recipe) return {};
  return buildMetadata({ locale, path: `/recipes/${slug}`, title: recipe.title, description: recipe.description, type: "article" });
}

const iso = (minutes: number) => `PT${minutes}M`;

/** schema.org Recipe markup. Ratings are only included when real user ratings exist. */
function recipeJsonLd(recipe: Recipe, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.description,
    url,
    inLanguage: recipe.locale,
    author: { "@type": "Organization", name: recipe.authorName },
    datePublished: recipe.createdAt.slice(0, 10),
    dateModified: recipe.updatedAt.slice(0, 10),
    ...(recipe.coverImage ? { image: [recipe.coverImage] } : {}),
    recipeCategory: recipe.category,
    ...(recipe.cuisine ? { recipeCuisine: recipe.cuisine } : {}),
    recipeYield: String(recipe.servings),
    prepTime: iso(recipe.prepMinutes),
    cookTime: iso(recipe.cookMinutes),
    totalTime: iso(recipe.prepMinutes + recipe.cookMinutes),
    keywords: [recipe.deviceCategory, ...recipe.programs, ...recipe.dietary].join(", "),
    recipeIngredient: recipe.ingredients.map((i) => `${i.quantity ?? ""} ${i.unit && i.unit !== "piece" ? i.unit : ""} ${i.name}`.replace(/\s+/g, " ").trim()),
    recipeInstructions: recipe.steps.map((s) => ({ "@type": "HowToStep", position: s.position, text: s.instruction })),
    ...(recipe.accessories.length ? { tool: recipe.accessories.map((name) => ({ "@type": "HowToTool", name })) } : {}),
    ...(recipe.ratingAverage != null && recipe.ratingCount > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: recipe.ratingAverage, ratingCount: recipe.ratingCount } }
      : {}),
  };
}

export default async function RecipePage({ params }: Props) {
  const { locale: raw, slug } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  const store = getPublicStore();
  const recipe = await store.getRecipeBySlug(slug, locale);
  if (!recipe) notFound();
  const t = await getTranslations("recipes");
  const [models, related] = await Promise.all([store.listDeviceModels(), store.listRecipes(locale, { deviceCategory: recipe.deviceCategory })]);
  const url = absoluteUrl(`/${locale}/recipes/${slug}`);
  return (
    <div className="container-page py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeJsonLd(recipe, url)).replace(/</g, "\\u003c") }} />
      <Link href="/recipes" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft className="size-4" />{t("backToRecipes")}</Link>
      <RecipeView
        recipe={recipe}
        system="metric"
        unit="C"
        models={models}
        userDevices={null}
        actions={
          <>
            <Button asChild size="lg"><Link href={`/dashboard/cooking/${recipe.id}`}><Play />{t("startCooking")}</Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href={`/dashboard/chef?recipe=${recipe.id}`}><ChefHat />{t("askChef")}</Link></Button>
          </>
        }
      />
      {related.filter((r) => r.id !== recipe.id).length > 0 ? (
        <section className="mt-20" aria-labelledby="related-title">
          <h2 id="related-title" className="mb-6 text-3xl">{t("related")}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.filter((r) => r.id !== recipe.id).slice(0, 3).map((r) => <RecipeCard key={r.id} recipe={r} href={`/recipes/${r.slug}`} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
