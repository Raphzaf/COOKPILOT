import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { QuotaCard } from "@/components/dashboard/quota-card";
import { SubscriptionPanel } from "@/components/dashboard/subscription-panel";
import { Notice, PageHeader } from "@/components/ui/states";
import { getEntitlements, getQuota } from "@/lib/billing/entitlements";
import { annualSavingsPercent, PRICING } from "@/lib/billing/plans";
import { getIntegrationStatus } from "@/lib/env";
import { intlLocale } from "@/lib/i18n/locale";
import { appPage } from "@/lib/page-context";

export default async function SubscriptionPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ checkout?: string }> }) {
  const { locale, user, store } = await appPage(params);
  const t = await getTranslations("subscription");
  const { checkout } = await searchParams;
  const { plan, subscription } = await getEntitlements(store, user.id);
  const quota = await getQuota(store, user.id, plan);
  const status = getIntegrationStatus();
  const end = subscription?.currentPeriodEnd ? new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long" }).format(new Date(subscription.currentPeriodEnd)) : null;
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      {checkout === "success" ? <Notice icon={CheckCircle2} className="mb-6">{t("checkoutSuccess")}</Notice> : null}
      {checkout === "cancelled" ? <Notice tone="warning" className="mb-6">{t("checkoutCancelled")}</Notice> : null}
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">{t("currentPlan")}</p>
          <p className="mt-1 font-serif text-3xl" data-testid="current-plan">{plan === "pro" ? t("pro") : t("free")}</p>
          {plan === "pro" && subscription && end ? (
            <p className="mt-2 text-sm text-muted">
              {subscription.cancelAtPeriodEnd || subscription.status === "canceled" ? t("endsOn", { date: end }) : t("renewsOn", { date: end })}
              {subscription.interval ? ` · ${t(subscription.interval === "year" ? "billedAnnually" : "billedMonthly")}` : ""}
            </p>
          ) : null}
          {subscription?.status === "past_due" ? <p className="mt-2 text-sm text-terracotta">{t("pastDue")}</p> : null}
        </div>
        <QuotaCard quota={quota} />
      </div>
      <SubscriptionPanel
        pricing={{ monthly: PRICING.proMonthly, annual: PRICING.proAnnual, savings: annualSavingsPercent(), currency: PRICING.currency }}
        plan={plan}
        isDemo={user.isDemo}
        stripeReady={status.stripe && status.stripePrices}
        hasCustomer={Boolean(subscription?.stripeCustomerId)}
      />
    </>
  );
}
