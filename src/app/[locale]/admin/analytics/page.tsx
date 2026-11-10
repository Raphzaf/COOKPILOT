import { getTranslations } from "next-intl/server";
import { Notice, PageHeader } from "@/components/ui/states";
import { adminPage } from "@/lib/admin-page";
import { PLANS, PRICING } from "@/lib/billing/plans";
import { getIntegrationStatus } from "@/lib/env";
import { intlLocale } from "@/lib/i18n/locale";

export default async function AdminAnalytics({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, store } = await adminPage(params);
  const t = await getTranslations("admin.analytics");
  const stats = await store.getAdminStats();
  const status = getIntegrationStatus();
  const usd = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 });
  const eur = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-IE", { style: "currency", currency: PRICING.currency });
  const day = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", timeZone: "UTC" });
  const max = Math.max(1, ...stats.usageByDay.map((d) => d.requests));
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [t("requests30d"), String(stats.aiRequests30d)],
          [t("cost30d"), usd.format(stats.aiCost30dUsd)],
          [t("avgCost"), stats.aiRequests30d ? usd.format(stats.aiCost30dUsd / stats.aiRequests30d) : "—"],
          [t("proSubscribers"), `${stats.proSubscribers} / ${stats.users}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-surface p-4"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 font-serif text-3xl tabular-nums">{value}</dd></div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-subtle">{t("costNote")}</p>

      <section className="mt-10" aria-labelledby="usage-title">
        <h2 id="usage-title" className="mb-4 text-2xl">{t("dailyUsage")}</h2>
        {stats.usageByDay.length === 0 ? <p className="rounded-xl border border-dashed border-border-strong p-6 text-sm text-muted">{t("noUsage")}</p> : (
          <table className="w-full text-sm">
            <caption className="sr-only">{t("dailyUsage")}</caption>
            <tbody>
              {stats.usageByDay.map((d) => (
                <tr key={d.day}>
                  <th scope="row" className="w-24 py-1.5 pr-3 text-left font-normal text-muted">{day.format(new Date(d.day))}</th>
                  <td className="py-1.5"><div className="h-5 rounded bg-primary/80" style={{ width: `${Math.max(2, (d.requests / max) * 100)}%` }} /></td>
                  <td className="w-16 py-1.5 pl-3 text-right tabular-nums">{d.requests}</td>
                  <td className="w-24 py-1.5 pl-3 text-right tabular-nums text-muted">{usd.format(d.costUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-10" aria-labelledby="plans-title">
        <h2 id="plans-title" className="mb-4 text-2xl">{t("plans")}</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          <li className="rounded-xl border border-border bg-surface p-4 text-sm"><p className="font-medium">Free</p><p className="mt-1 text-muted">{t("planLine", { generations: PLANS.free.aiGenerationsPerMonth, messages: PLANS.free.chefMessagesPerDay })}</p></li>
          <li className="rounded-xl border border-border bg-surface p-4 text-sm"><p className="font-medium">Pro — {eur.format(PRICING.proMonthly)} / {eur.format(PRICING.proAnnual)}</p><p className="mt-1 text-muted">{t("planLine", { generations: PLANS.pro.aiGenerationsPerMonth, messages: PLANS.pro.chefMessagesPerDay })}</p></li>
        </ul>
      </section>

      <Notice className="mt-10" tone={status.posthog ? "info" : "warning"}>{status.posthog ? t("posthogOn") : t("posthogOff")}</Notice>
    </>
  );
}
