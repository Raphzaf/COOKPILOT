import { Check, Minus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PublicPricing } from "@/components/marketing/public-pricing";
import { annualSavingsPercent, PLANS, PRICING } from "@/lib/billing/plans";
import { asLocale } from "@/lib/i18n/locale";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "pricing" });
  return buildMetadata({ locale, path: "/pricing", title: t("metaTitle"), description: t("metaDescription") });
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  const yes = <Check className="mx-auto size-4 text-primary" aria-label={t("included")} />;
  const no = <Minus className="mx-auto size-4 text-subtle" aria-label={t("notIncluded")} />;
  const rows: [string, React.ReactNode, React.ReactNode][] = [
    [t("compare.devices"), String(PLANS.free.maxDevices), t("compare.unlimited")],
    [t("compare.generations"), String(PLANS.free.aiGenerationsPerMonth), String(PLANS.pro.aiGenerationsPerMonth)],
    [t("compare.library"), yes, yes],
    [t("compare.cooking"), yes, yes],
    [t("compare.favorites"), String(PLANS.free.maxFavorites), t("compare.unlimited")],
    [t("compare.history"), t("compare.days", { count: PLANS.free.historyDays ?? 0 }), t("compare.full")],
    [t("compare.personalized"), no, yes],
    [t("compare.advancedCooking"), no, yes],
  ];
  return (
    <div className="container-page py-16">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <p className="eyebrow mb-3">{t("eyebrow")}</p>
        <h1 className="text-5xl md:text-6xl">{t("title")}</h1>
        <p className="mt-4 text-lg text-muted">{t("subtitle")}</p>
      </div>
      <PublicPricing monthly={PRICING.proMonthly} annual={PRICING.proAnnual} savings={annualSavingsPercent()} currency={PRICING.currency} />
      <section className="mx-auto mt-20 max-w-3xl" aria-labelledby="compare-title">
        <h2 id="compare-title" className="mb-6 text-3xl">{t("compare.title")}</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="px-5 py-3 font-medium text-muted">{t("compare.feature")}</th>
                <th scope="col" className="px-5 py-3 text-center font-semibold">{t("free.name")}</th>
                <th scope="col" className="px-5 py-3 text-center font-semibold text-primary">{t("pro.name")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(([label, free, pro]) => (
                <tr key={label}>
                  <th scope="row" className="px-5 py-3 text-left font-normal">{label}</th>
                  <td className="px-5 py-3 text-center text-muted">{free}</td>
                  <td className="px-5 py-3 text-center font-medium">{pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
