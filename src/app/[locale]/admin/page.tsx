import { CheckCircle2, CircleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Notice, PageHeader } from "@/components/ui/states";
import { adminPage } from "@/lib/admin-page";
import { getIntegrationStatus } from "@/lib/env";
import { Link } from "@/lib/i18n/navigation";

export default async function AdminHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, user, store } = await adminPage(params);
  const t = await getTranslations("admin");
  const stats = await store.getAdminStats();
  const status = getIntegrationStatus();
  const usd = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  const cards: [string, string | number, string][] = [
    [t("stats.users"), stats.users, "/admin/users"],
    [t("stats.pro"), stats.proSubscribers, "/admin/analytics"],
    [t("stats.devices"), stats.devices, "/admin/devices"],
    [t("stats.devicesReview"), stats.devicesNeedingReview, "/admin/devices"],
    [t("stats.recipesPublished"), stats.recipesPublished, "/admin/recipes"],
    [t("stats.recipesDraft"), stats.recipesDraft, "/admin/recipes"],
    [t("stats.knowledge"), stats.knowledgeDocuments, "/admin/knowledge"],
    [t("stats.openRequests"), stats.openRequests, "/admin/feedback"],
    [t("stats.aiRequests"), stats.aiRequests30d, "/admin/analytics"],
    [t("stats.aiCost"), usd.format(stats.aiCost30dUsd), "/admin/analytics"],
  ];
  const integrations: [string, boolean][] = [
    ["Supabase", status.supabase],
    ["Supabase service role", status.supabaseServiceRole],
    ["Gemini", status.gemini],
    ["Stripe", status.stripe],
    ["Stripe prices", status.stripePrices],
    ["Stripe webhook", status.stripeWebhook],
    ["Resend", status.resend],
    ["PostHog", status.posthog],
    ["Sentry", status.sentry],
  ];
  return (
    <>
      <PageHeader title={t("overview.title")} description={t("overview.subtitle")} />
      {user.isDemo ? <Notice tone="warning" className="mb-6">{t("demoNotice")}</Notice> : null}
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-5" data-testid="admin-stats">
        {cards.map(([label, value, href]) => (
          <Link key={label} href={href} className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 font-serif text-3xl tabular-nums">{value}</dd>
          </Link>
        ))}
      </dl>
      <section className="mt-10" aria-labelledby="integrations-title">
        <h2 id="integrations-title" className="mb-1 text-2xl">{t("integrations.title")}</h2>
        <p className="mb-4 text-sm text-muted">{t("integrations.subtitle")}</p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map(([name, ok]) => (
            <li key={name} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm">
              {name}
              <span className={ok ? "inline-flex items-center gap-1.5 text-accent-foreground" : "inline-flex items-center gap-1.5 text-amber-foreground"}>
                {ok ? <CheckCircle2 className="size-4" /> : <CircleAlert className="size-4" />}
                {ok ? t("integrations.configured") : t("integrations.missing")}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">{status.sentry ? t("integrations.errorsSentry") : t("integrations.errorsLogs")}</p>
      </section>
    </>
  );
}
