"use client";

import { ArrowLeft, BarChart3, BookOpen, CookingPot, FileText, LayoutDashboard, MessageSquareText, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", key: "overview", icon: LayoutDashboard },
  { href: "/admin/devices", key: "devices", icon: CookingPot },
  { href: "/admin/recipes", key: "recipes", icon: BookOpen },
  { href: "/admin/knowledge", key: "knowledge", icon: FileText },
  { href: "/admin/users", key: "users", icon: Users },
  { href: "/admin/feedback", key: "feedback", icon: MessageSquareText },
  { href: "/admin/analytics", key: "analytics", icon: BarChart3 },
] as const;

export function AdminNav() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="flex gap-1 overflow-x-auto border-b border-border pb-px">
      <Link href="/dashboard" className="flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm text-muted hover:text-foreground"><ArrowLeft className="size-4" />{t("back")}</Link>
      {ITEMS.map(({ href, key, icon: Icon }) => {
        const on = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={on ? "page" : undefined} className={cn("flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm", on ? "border-primary font-medium text-foreground" : "border-transparent text-muted hover:text-foreground")}>
            <Icon className="size-4" />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
