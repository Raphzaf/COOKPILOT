import { Clock, Star, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import type { RecipeSummary } from "@/lib/domain/types";
import { Link } from "@/lib/i18n/navigation";
import { DemoBadge, ProvenanceBadge } from "./provenance-badge";
import { RecipeArt } from "./recipe-art";

export function RecipeCover({ recipe, sizes, priority }: { recipe: Pick<RecipeSummary, "coverImage" | "illustration" | "title">; sizes: string; priority?: boolean }) {
  return recipe.coverImage ? (
    <Image src={recipe.coverImage} alt={recipe.title} fill sizes={sizes} priority={priority} className="object-cover" />
  ) : (
    <RecipeArt kind={recipe.illustration} title={recipe.title} />
  );
}

export function RecipeCard({ recipe, href, footer }: { recipe: RecipeSummary; href: string; footer?: React.ReactNode }) {
  const t = useTranslations("recipes");
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-card transition-transform duration-200 hover:-translate-y-0.5">
      <div className="relative aspect-[4/3] overflow-hidden bg-sunken">
        <RecipeCover recipe={recipe} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <ProvenanceBadge provenance={recipe.provenance} className="bg-surface/95 shadow-sm" />
          {recipe.isDemo ? <DemoBadge className="border-transparent bg-surface/95 shadow-sm" /> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow mb-1.5">{t(`deviceCategories.${recipe.deviceCategory}`)}</p>
        <h3 className="text-xl leading-snug">
          <Link href={href} className="after:absolute after:inset-0">
            {recipe.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted">{recipe.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" />{t("minutes", { count: recipe.prepMinutes + recipe.cookMinutes })}</span>
          <span className="inline-flex items-center gap-1.5"><Users className="size-3.5" />{t("servings", { count: recipe.servings })}</span>
          <span>{t(`difficulty.${recipe.difficulty}`)}</span>
          {recipe.ratingAverage != null ? (
            <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-current text-amber-foreground" />{recipe.ratingAverage.toFixed(1)}</span>
          ) : null}
        </div>
        {footer ? <div className="relative z-10 mt-4">{footer}</div> : null}
      </div>
    </article>
  );
}
