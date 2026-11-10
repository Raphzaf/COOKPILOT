import { ArrowRight, Database } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { isDemoMode } from "@/lib/env";
import { Link } from "@/lib/i18n/navigation";

/** Shared frame for auth pages. In demo mode it shows the setup state instead of a form that cannot work. */
export async function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const t = await getTranslations("setup");
  return (
    <main className="container-page flex min-h-[calc(100dvh-2rem)] flex-col items-center justify-center py-12">
      <Link href="/" className="mb-8"><Logo /></Link>
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 shadow-card md:p-9">
        {isDemoMode() ? (
          <div className="text-center" data-testid="auth-setup-state">
            <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-amber-soft text-amber-foreground"><Database className="size-5" /></span>
            <h1 className="text-2xl">{t("authTitle")}</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t("authBody")}</p>
            <Button asChild className="mt-6 w-full"><Link href="/dashboard">{t("continueDemo")}<ArrowRight /></Link></Button>
            <p className="mt-4 text-xs text-subtle">{t("authHint")}</p>
          </div>
        ) : (
          <>
            <h1 className="text-center text-3xl">{title}</h1>
            <p className="mb-7 mt-2 text-center text-sm text-muted">{subtitle}</p>
            {children}
          </>
        )}
      </div>
    </main>
  );
}
