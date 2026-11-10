import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/lib/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">{t("tagline")}</p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">{t("product")}</p>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link className="hover:text-foreground" href="/recipes">{nav("recipes")}</Link></li>
            <li><Link className="hover:text-foreground" href="/pricing">{nav("pricing")}</Link></li>
            <li><Link className="hover:text-foreground" href="/dashboard">{nav("openApp")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">{t("company")}</p>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link className="hover:text-foreground" href="/about">{nav("about")}</Link></li>
            <li><Link className="hover:text-foreground" href="/privacy">{t("privacy")}</Link></li>
            <li><Link className="hover:text-foreground" href="/terms">{t("terms")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">{t("language")}</p>
          <Suspense>
            <LocaleSwitcher />
          </Suspense>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-subtle md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} CookPilot</p>
          <p className="max-w-2xl md:text-right">{t("disclaimer")}</p>
        </div>
      </div>
    </footer>
  );
}
