import { ArrowRight, ChefHat, CookingPot, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { QuotaCard } from "@/components/dashboard/quota-card";
import { DeviceSummary } from "@/components/devices/device-bits";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/states";
import { getEntitlements, getQuota, historyCutoff } from "@/lib/billing/entitlements";
import { intlLocale } from "@/lib/i18n/locale";
import { Link } from "@/lib/i18n/navigation";
import { appPage } from "@/lib/page-context";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, user, store } = await appPage(params);
  const t = await getTranslations("dashboard");
  const { plan, limits } = await getEntitlements(store, user.id);
  const [devices, quota, sessions, allRecipes] = await Promise.all([
    store.listUserDevices(user.id),
    getQuota(store, user.id, plan),
    store.listCookingSessions(user.id, historyCutoff(limits)),
    store.listRecipes(locale),
  ]);
  const categories = new Set(devices.map((d) => d.model.category.slug));
  const forYou = allRecipes.filter((r) => categories.has(r.deviceCategory)).slice(0, 3);
  const suggestions = (devices.length > 0 ? ["weeknight", "ingredients", "adapt"] : ["weeknight"]) as ("weeknight" | "ingredients" | "adapt")[];
  const date = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium" });

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={user.profile.displayName ? t("greetingName", { name: user.profile.displayName }) : t("greeting")}
        description={t("subtitle")}
        actions={<Button asChild><Link href="/dashboard/chef"><ChefHat />{t("askChef")}</Link></Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-border bg-surface p-5" aria-labelledby="ask-title">
          <h2 id="ask-title" className="text-xl">{t("ask.title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("ask.subtitle")}</p>
          <ul className="mt-4 space-y-2">
            {suggestions.map((key) => (
              <li key={key}>
                <Link href={`/dashboard/chef?q=${encodeURIComponent(t(`ask.suggestions.${key}`))}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm transition-colors hover:border-border-strong hover:bg-sunken">
                  {t(`ask.suggestions.${key}`)}
                  <ArrowRight className="size-4 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <div className="space-y-6">
          <QuotaCard quota={quota} />
          <section className="rounded-xl border border-border bg-surface p-5" aria-labelledby="recent-title">
            <h2 id="recent-title" className="text-xl">{t("recent.title")}</h2>
            {sessions.length === 0 ? (
              <p className="mt-2 text-sm text-muted">{t("recent.empty")}</p>
            ) : (
              <ul className="mt-3 divide-y divide-border text-sm">
                {sessions.slice(0, 4).map((s) => (
                  <li key={s.id} className="flex justify-between gap-3 py-2">
                    <Link href={`/dashboard/recipes/${s.recipeId}`} className="truncate hover:underline">{s.recipeTitle}</Link>
                    <span className="shrink-0 text-muted">{date.format(new Date(s.completedAt))}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section className="mt-12" aria-labelledby="kitchen-title">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 id="kitchen-title" className="text-2xl">{t("kitchen.title")}</h2>
          <Button asChild variant="secondary" size="sm"><Link href="/dashboard/devices/add"><Plus />{t("kitchen.add")}</Link></Button>
        </div>
        {devices.length === 0 ? (
          <EmptyState icon={CookingPot} title={t("kitchen.emptyTitle")} description={t("kitchen.emptyBody")} action={<Button asChild><Link href="/dashboard/devices/add"><Plus />{t("kitchen.add")}</Link></Button>} />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {devices.map((d) => (
              <li key={d.id}>
                <Link href={`/dashboard/devices/${d.id}`} className="block rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-strong">
                  <DeviceSummary model={d.model}>{d.nickname ? <p className="mt-2 text-sm text-muted">“{d.nickname}”</p> : null}</DeviceSummary>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {forYou.length > 0 ? (
        <section className="mt-12" aria-labelledby="foryou-title">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 id="foryou-title" className="text-2xl">{t("forYou.title")}</h2>
            <Button asChild variant="link"><Link href="/dashboard/recipes">{t("forYou.all")}<ArrowRight /></Link></Button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {forYou.map((r) => <RecipeCard key={r.id} recipe={r} href={`/dashboard/recipes/${r.id}`} />)}
          </div>
        </section>
      ) : null}
    </>
  );
}
