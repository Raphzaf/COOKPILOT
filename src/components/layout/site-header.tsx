import { Menu } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "@/lib/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";

export async function SiteHeader() {
  const t = await getTranslations("nav");
  const links = [
    { href: "/recipes", label: t("recipes") },
    { href: "/#appliances", label: t("appliances") },
    { href: "/pricing", label: t("pricing") },
    { href: "/about", label: t("about") },
  ] as const;
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="CookPilot">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm md:flex" aria-label={t("main")}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Suspense>
            <LocaleSwitcher className="hidden sm:inline-flex" />
          </Suspense>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">{t("login")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard">{t("openApp")}</Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("menu")}>
                <Menu />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {links.map((l) => (
                <DropdownMenuItem key={l.href} asChild>
                  <Link href={l.href}>{l.label}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem asChild>
                <Link href="/login">{t("login")}</Link>
              </DropdownMenuItem>
              <div className="px-3 py-2 sm:hidden">
                <Suspense>
                  <LocaleSwitcher />
                </Suspense>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
