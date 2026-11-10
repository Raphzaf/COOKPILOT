"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
import { PricingTable, type PricingTableProps } from "./pricing-table";

export function PublicPricing(props: Pick<PricingTableProps, "monthly" | "annual" | "savings" | "currency">) {
  const t = useTranslations("pricing");
  return (
    <PricingTable
      {...props}
      freeAction={<Button asChild variant="secondary" className="w-full"><Link href="/register">{t("free.cta")}</Link></Button>}
      proAction={() => <Button asChild className="w-full"><Link href="/dashboard/subscription">{t("pro.cta")}</Link></Button>}
    />
  );
}
