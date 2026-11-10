"use client";

import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface PricingTableProps {
  monthly: number;
  annual: number;
  savings: number;
  currency: string;
  /** Rendered under each plan; receives the selected billing interval. */
  freeAction: React.ReactNode;
  proAction: (interval: "month" | "year") => React.ReactNode;
  currentPlan?: "free" | "pro";
}

export function PricingTable({ monthly, annual, savings, currency, freeAction, proAction, currentPlan }: PricingTableProps) {
  const t = useTranslations("pricing");
  const locale = useLocale();
  const [interval, setInterval] = useState<"month" | "year">("year");
  const money = (value: number) => new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-IE", { style: "currency", currency }).format(value);
  const free = ["devices", "generations", "library", "favorites", "cooking"] as const;
  const pro = ["devices", "generations", "history", "personalized", "cooking", "favorites"] as const;
  return (
    <div>
      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-full border border-border-strong bg-surface p-1 text-sm" role="group" aria-label={t("billingPeriod")}>
          {(["month", "year"] as const).map((i) => (
            <button key={i} type="button" aria-pressed={interval === i} onClick={() => setInterval(i)} className={cn("cursor-pointer rounded-full px-4 py-1.5 transition-colors", interval === i ? "bg-foreground text-surface" : "text-muted")}>
              {t(i === "month" ? "monthly" : "annual")}
              {i === "year" ? <span className={cn("ml-2 text-xs", interval === i ? "text-[#dfe4c8]" : "text-primary")}>{t("save", { percent: savings })}</span> : null}
            </button>
          ))}
        </div>
      </div>
      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        <section className="flex flex-col rounded-2xl border border-border bg-surface p-7" aria-labelledby="plan-free">
          <div className="flex items-center justify-between">
            <h3 id="plan-free" className="text-2xl">{t("free.name")}</h3>
            {currentPlan === "free" ? <Badge variant="outline">{t("current")}</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted">{t("free.tagline")}</p>
          <p className="mt-6 font-serif text-5xl">{money(0)}</p>
          <p className="mt-1 text-sm text-muted">{t("forever")}</p>
          <ul className="mt-7 flex-1 space-y-3 text-sm">
            {free.map((f) => <li key={f} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{t(`free.features.${f}`)}</li>)}
          </ul>
          <div className="mt-8">{freeAction}</div>
        </section>
        <section className="relative flex flex-col rounded-2xl border-2 border-primary bg-surface p-7 shadow-card" aria-labelledby="plan-pro">
          <div className="flex items-center justify-between">
            <h3 id="plan-pro" className="text-2xl">{t("pro.name")}</h3>
            {currentPlan === "pro" ? <Badge variant="olive">{t("current")}</Badge> : <Badge variant="olive">{t("popular")}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">{t("pro.tagline")}</p>
          <p className="mt-6 font-serif text-5xl" data-testid="pro-price">
            {money(interval === "month" ? monthly : annual)}
            <span className="ml-1 font-sans text-base text-muted">/ {t(interval === "month" ? "perMonth" : "perYear")}</span>
          </p>
          <p className="mt-1 text-sm text-muted">{interval === "year" ? t("annualEquivalent", { price: money(annual / 12) }) : t("cancelAnytime")}</p>
          <ul className="mt-7 flex-1 space-y-3 text-sm">
            {pro.map((f) => <li key={f} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{t(`pro.features.${f}`)}</li>)}
          </ul>
          <div className="mt-8">{proAction(interval)}</div>
        </section>
      </div>
      <p className="mt-6 text-center text-xs text-subtle">{t("vatNote")}</p>
    </div>
  );
}
