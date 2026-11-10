import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { RecipeStatusSelect } from "@/components/admin/admin-actions";
import { RecipeForm } from "@/components/admin/recipe-form";
import { DemoBadge, ProvenanceBadge } from "@/components/recipes/provenance-badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/states";
import { adminPage } from "@/lib/admin-page";
import { asLocale } from "@/lib/i18n/locale";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

export default async function AdminRecipes({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ edit?: string; lang?: string }> }) {
  const { locale, store } = await adminPage(params);
  const t = await getTranslations("admin.recipes");
  const { edit, lang } = await searchParams;
  if (edit) {
    const editLocale = asLocale(lang ?? locale);
    const [input, models, categories] = await Promise.all([edit === "new" ? Promise.resolve(null) : store.getRecipeInput(edit), store.listDeviceModels({ includeUnpublished: true }), store.listCategories()]);
    return (
      <>
        <PageHeader title={input ? t("editTitle") : t("newTitle")} description={t("formIntro")} actions={<Button asChild variant="secondary"><Link href="/admin/recipes">{t("backToList")}</Link></Button>} />
        <div className="mb-4 inline-flex rounded-full border border-border-strong bg-surface p-1 text-sm" role="tablist" aria-label={t("translation")}>
          {(["en", "fr"] as const).map((l) => (
            <Link key={l} role="tab" aria-selected={editLocale === l} href={`/admin/recipes?edit=${edit}&lang=${l}`} className={cn("rounded-full px-4 py-1.5 uppercase", editLocale === l ? "bg-foreground text-surface" : "text-muted")}>
              {l}{input && !input.translations[l] ? " ·" : ""}
            </Link>
          ))}
        </div>
        <RecipeForm key={`${edit}-${editLocale}`} input={input} editLocale={editLocale} models={models} categories={categories} />
      </>
    );
  }
  const recipes = await store.listAllRecipes(locale);
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} actions={<Button asChild><Link href="/admin/recipes?edit=new"><Plus />{t("new")}</Link></Button>} />
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[44rem] text-sm">
          <thead><tr className="border-b border-border text-left text-xs text-muted"><th className="px-4 py-3 font-medium">{t("recipe")}</th><th className="px-4 py-3 font-medium">{t("provenance")}</th><th className="px-4 py-3 font-medium">{t("rating")}</th><th className="px-4 py-3 font-medium">{t("status")}</th><th /></tr></thead>
          <tbody className="divide-y divide-border">
            {recipes.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3"><span className="font-medium">{r.title}</span><br /><span className="text-xs text-muted">{r.deviceCategory} · v{r.version}</span></td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5"><ProvenanceBadge provenance={r.provenance} />{r.isDemo ? <DemoBadge /> : null}</div></td>
                <td className="px-4 py-3 tabular-nums text-muted">{r.ratingAverage != null ? `${r.ratingAverage.toFixed(1)} (${r.ratingCount})` : "—"}</td>
                <td className="px-4 py-3"><RecipeStatusSelect id={r.id} status={r.status} /></td>
                <td className="px-4 py-3 text-right"><Button asChild variant="ghost" size="sm"><Link href={`/admin/recipes?edit=${r.id}`}>{t("edit")}</Link></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
