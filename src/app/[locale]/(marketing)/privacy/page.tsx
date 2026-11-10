import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/marketing/legal-page";
import { PRIVACY } from "@/content/legal";
import { asLocale } from "@/lib/i18n/locale";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  return buildMetadata({ locale, path: "/privacy", title: PRIVACY[locale].title, description: PRIVACY[locale].intro });
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  return <LegalPage document={PRIVACY[locale]} locale={locale} />;
}
