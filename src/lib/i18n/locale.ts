import type { Locale } from "@/lib/domain/types";
import { routing } from "./routing";

export function asLocale(value: string | undefined | null): Locale {
  return (routing.locales as readonly string[]).includes(value ?? "") ? (value as Locale) : routing.defaultLocale;
}

export function intlLocale(locale: Locale): string {
  return locale === "fr" ? "fr-FR" : "en-GB";
}
