import { BookOpen, Heart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { FavoriteButton } from "@/components/recipes/recipe-actions";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/states";
import { getEntitlements } from "@/lib/billing/entitlements";
import { Link } from "@/lib/i18n/navigation";
import { appPage } from "@/lib/page-context";

export default async function FavoritesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, user, store } = await appPage(params);
  const t = await getTranslations("favorites");
  const [favorites, { limits }] = await Promise.all([store.listFavorites(user.id, locale), getEntitlements(store, user.id)]);
  return (
    <>
      <PageHeader title={t("title")} description={limits.maxFavorites != null ? t("subtitleLimited", { count: favorites.length, max: limits.maxFavorites }) : t("subtitle")} />
      {favorites.length === 0 ? (
        <EmptyState icon={Heart} title={t("emptyTitle")} description={t("emptyBody")} action={<Button asChild><Link href="/dashboard/recipes"><BookOpen />{t("browse")}</Link></Button>} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="favorites-grid">
          {favorites.map((r) => <RecipeCard key={r.id} recipe={r} href={`/dashboard/recipes/${r.id}`} footer={<FavoriteButton recipeId={r.id} initial compact />} />)}
        </div>
      )}
    </>
  );
}
