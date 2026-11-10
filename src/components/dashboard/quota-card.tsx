import { Sparkles } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/states";
import type { QuotaState } from "@/lib/billing/plans";
import type { Locale } from "@/lib/domain/types";
import { intlLocale } from "@/lib/i18n/locale";
import { Link } from "@/lib/i18n/navigation";

export async function QuotaCard({ quota }: { quota: QuotaState }) {
  const t = await getTranslations("dashboard");
  const locale = (await getLocale()) as Locale;
  const reset = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(quota.resetsAt));
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium"><Sparkles className="size-4 text-primary" />{t("quota.title")}</p>
        <p className="text-sm tabular-nums text-muted" data-testid="quota-remaining">{t("quota.remaining", { remaining: quota.remaining, limit: quota.limit })}</p>
      </div>
      <Progress className="mt-3" value={(quota.used / quota.limit) * 100} label={t("quota.title")} />
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
        <p>{t("quota.resets", { date: reset })}</p>
        {quota.plan === "free" ? <Button asChild variant="link" size="sm" className="h-auto"><Link href="/dashboard/subscription">{t("quota.upgrade")}</Link></Button> : null}
      </div>
    </div>
  );
}
