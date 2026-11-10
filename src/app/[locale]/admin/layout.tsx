import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/layout/logo";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth/session";
import { asLocale } from "@/lib/i18n/locale";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const user = await requireAdmin(locale);
  const t = await getTranslations("admin");
  return (
    <div className="container-page py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Logo />
        <Badge variant="solid"><ShieldCheck />{user.isDemo ? t("demoBadge") : t("badge")}</Badge>
      </div>
      <AdminNav />
      <main id="main" className="py-8">{children}</main>
    </div>
  );
}
