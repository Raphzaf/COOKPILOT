import type { Metadata } from "next";
import type { Locale } from "@/lib/domain/types";
import { getAppUrl } from "@/lib/env";
import { routing } from "@/lib/i18n/routing";

export function absoluteUrl(path: string): string {
  return `${getAppUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Localised metadata with canonical URL, hreflang alternates, Open Graph and Twitter cards. */
export function buildMetadata(opts: { locale: Locale; path: string; title: string; description: string; index?: boolean; type?: "website" | "article" }): Metadata {
  const path = opts.path === "/" ? "" : opts.path;
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = absoluteUrl(`/${l}${path}`);
  languages["x-default"] = absoluteUrl(`/${routing.defaultLocale}${path}`);
  const url = absoluteUrl(`/${opts.locale}${path}`);
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url, languages },
    robots: opts.index === false ? { index: false, follow: false } : undefined,
    openGraph: {
      type: opts.type ?? "website",
      url,
      siteName: "CookPilot",
      title: opts.title,
      description: opts.description,
      locale: opts.locale === "fr" ? "fr_FR" : "en_GB",
    },
    twitter: { card: "summary_large_image", title: opts.title, description: opts.description },
  };
}

export function programLabel(key: string): string {
  return key.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
