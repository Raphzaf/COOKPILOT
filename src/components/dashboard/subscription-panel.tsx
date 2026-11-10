"use client";

import { ExternalLink, FlaskConical } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { openBillingPortalAction, setDemoPlanAction, startCheckoutAction } from "@/actions/billing";
import { PricingTable, type PricingTableProps } from "@/components/marketing/pricing-table";
import { Button } from "@/components/ui/button";
import { Notice, Spinner } from "@/components/ui/states";
import { useRouter } from "@/lib/i18n/navigation";

export function SubscriptionPanel({
  pricing,
  plan,
  isDemo,
  stripeReady,
  hasCustomer,
}: {
  pricing: Pick<PricingTableProps, "monthly" | "annual" | "savings" | "currency">;
  plan: "free" | "pro";
  isDemo: boolean;
  stripeReady: boolean;
  hasCustomer: boolean;
}) {
  const t = useTranslations("subscription");
  const p = useTranslations("pricing");
  const e = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();

  const checkout = (interval: "month" | "year") =>
    start(async () => {
      const result = await startCheckoutAction(interval, locale);
      if (!result.ok) return void toast.error(e(result.error));
      window.location.assign(result.data.url);
    });
  const portal = () =>
    start(async () => {
      const result = await openBillingPortalAction(locale);
      if (!result.ok) return void toast.error(e(result.error));
      window.location.assign(result.data.url);
    });
  const demoPlan = (next: "free" | "pro") =>
    start(async () => {
      const result = await setDemoPlanAction(next);
      if (!result.ok) return void toast.error(e(result.error));
      router.refresh();
    });

  return (
    <div className="space-y-6">
      {isDemo ? (
        <Notice tone="warning" icon={FlaskConical}>
          <p>{t("demoNotice")}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => demoPlan(plan === "pro" ? "free" : "pro")} disabled={pending} data-testid="demo-plan-toggle">
            {pending ? <Spinner /> : null}
            {plan === "pro" ? t("demoToFree") : t("demoToPro")}
          </Button>
        </Notice>
      ) : !stripeReady ? (
        <Notice tone="warning">{t("stripeNotConfigured")}</Notice>
      ) : null}

      {hasCustomer && !isDemo ? (
        <Button variant="secondary" onClick={portal} disabled={pending || !stripeReady}>{pending ? <Spinner /> : <ExternalLink />}{t("manage")}</Button>
      ) : null}

      <PricingTable
        {...pricing}
        currentPlan={plan}
        freeAction={plan === "free" ? <Button variant="secondary" className="w-full" disabled>{p("current")}</Button> : <p className="text-center text-sm text-muted">{t("downgradeHint")}</p>}
        proAction={(interval) =>
          plan === "pro" ? (
            <Button className="w-full" variant="secondary" disabled>{p("current")}</Button>
          ) : (
            <Button className="w-full" onClick={() => checkout(interval)} disabled={pending || isDemo || !stripeReady} data-testid="checkout-button">
              {pending ? <Spinner /> : null}
              {p("pro.cta")}
            </Button>
          )
        }
      />
    </div>
  );
}
