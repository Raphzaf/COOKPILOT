import { Suspense } from "react";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Logo } from "@/components/layout/logo";
import { Badge } from "@/components/ui/badge";
import type { PlanId, SessionUser } from "@/lib/domain/types";
import { Link } from "@/lib/i18n/navigation";
import { MobileNav, SidebarNav, UserMenu } from "./dashboard-nav";

export function AppShell({ user, plan, planLabel, fallbackName, children }: { user: SessionUser; plan: PlanId; planLabel: string; fallbackName: string; children: React.ReactNode }) {
  const isAdmin = user.profile.role === "admin";
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
        <Link href="/dashboard" className="mb-8 px-2"><Logo /></Link>
        <SidebarNav isAdmin={isAdmin} />
        <div className="mt-auto px-2">
          <Suspense><LocaleSwitcher /></Suspense>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/70 bg-background/85 px-5 backdrop-blur-md md:px-8">
          <Link href="/dashboard" className="lg:hidden"><Logo /></Link>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <Badge variant={plan === "pro" ? "olive" : "outline"} data-testid="plan-badge">{planLabel}</Badge>
            <UserMenu name={user.profile.displayName || fallbackName} email={user.email} isDemo={user.isDemo} isAdmin={isAdmin} />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl px-5 pb-28 pt-8 md:px-8 lg:pb-16">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
