import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/dashboard/app-shell";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/billing/entitlements";
import { getStore } from "@/lib/data";
import { isDemoAdminEnabled } from "@/lib/env";
import { asLocale } from "@/lib/i18n/locale";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const user = await requireOnboardedUser(locale);
  const { plan } = await getEntitlements(await getStore(), user.id);
  const t = await getTranslations("nav");
  return (
    <AppShell user={user} plan={plan} planLabel={t(plan === "pro" ? "planPro" : "planFree")} fallbackName={t("account")} canSwitchRole={isDemoAdminEnabled()}>
      {children}
    </AppShell>
  );
}
