"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { routing } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  return (
    <div className={cn("inline-flex items-center gap-1 text-sm", className)} role="group" aria-label={t("language")}>
      <Languages className="mr-1 size-4 text-muted" aria-hidden />
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          onClick={() => router.replace(`${pathname}${search.size ? `?${search}` : ""}`, { locale: l })}
          className={cn("cursor-pointer rounded-md px-1.5 py-0.5 uppercase", l === locale ? "bg-sunken font-semibold text-foreground" : "text-muted hover:text-foreground")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
