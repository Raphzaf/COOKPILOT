"use client";

import { BookOpen, ChefHat, CookingPot, CreditCard, Heart, History, LayoutDashboard, LogOut, Settings, ShieldCheck, UserRound, UserRoundCog } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { signOutAction } from "@/actions/auth";
import { setDemoRoleAction } from "@/actions/billing";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link, usePathname, useRouter } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", key: "overview", icon: LayoutDashboard, exact: true, mobile: true },
  { href: "/dashboard/chef", key: "chef", icon: ChefHat, mobile: true },
  { href: "/dashboard/recipes", key: "recipes", icon: BookOpen, mobile: true },
  { href: "/dashboard/devices", key: "devices", icon: CookingPot, mobile: true },
  { href: "/dashboard/favorites", key: "favorites", icon: Heart, mobile: true },
  { href: "/dashboard/history", key: "history", icon: History },
  { href: "/dashboard/settings", key: "settings", icon: Settings },
  { href: "/dashboard/subscription", key: "subscription", icon: CreditCard },
] as const;

function useActive() {
  const pathname = usePathname();
  return (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
}

export function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("nav");
  const active = useActive();
  return (
    <nav aria-label={t("app")} className="space-y-1">
      {ITEMS.map(({ href, key, icon: Icon, ...rest }) => {
        const on = active(href, "exact" in rest ? rest.exact : false);
        return (
          <Link key={href} href={href} aria-current={on ? "page" : undefined} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors", on ? "bg-accent font-medium text-accent-foreground" : "text-muted hover:bg-sunken hover:text-foreground")}>
            <Icon className="size-4" />
            {t(key)}
          </Link>
        );
      })}
      {isAdmin ? (
        <Link href="/admin" className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-sunken hover:text-foreground">
          <ShieldCheck className="size-4" />
          {t("admin")}
        </Link>
      ) : null}
    </nav>
  );
}

export function MobileNav() {
  const t = useTranslations("nav");
  const active = useActive();
  return (
    <nav aria-label={t("app")} className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5">
        {ITEMS.filter((i) => "mobile" in i && i.mobile).map(({ href, key, icon: Icon, ...rest }) => {
          const on = active(href, "exact" in rest ? rest.exact : false);
          return (
            <li key={href}>
              <Link href={href} aria-current={on ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px]", on ? "font-medium text-primary" : "text-muted")}>
                <Icon className="size-5" />
                {t(`short.${key}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function UserMenu({ name, email, isDemo, isAdmin }: { name: string; email: string; isDemo: boolean; isAdmin: boolean }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [pending, start] = useTransition();
  const signOut = () =>
    start(async () => {
      await signOutAction();
      router.replace("/");
      router.refresh();
    });
  const switchRole = () =>
    start(async () => {
      await setDemoRoleAction(isAdmin ? "user" : "admin");
      router.refresh();
    });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" className="max-w-48 gap-2" aria-label={t("account")} data-testid="user-menu">
          <UserRound />
          <span className="truncate">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="truncate">{isDemo ? t("demoAccount") : email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/dashboard/history"><History />{t("history")}</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/dashboard/settings"><Settings />{t("settings")}</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/dashboard/subscription"><CreditCard />{t("subscription")}</Link></DropdownMenuItem>
        {isAdmin ? <DropdownMenuItem asChild><Link href="/admin"><ShieldCheck />{t("admin")}</Link></DropdownMenuItem> : null}
        <DropdownMenuSeparator />
        {isDemo ? (
          <DropdownMenuItem onSelect={switchRole} disabled={pending} data-testid="demo-role-switch"><UserRoundCog />{isAdmin ? t("demoAsUser") : t("demoAsAdmin")}</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={signOut} disabled={pending}><LogOut />{t("signOut")}</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
