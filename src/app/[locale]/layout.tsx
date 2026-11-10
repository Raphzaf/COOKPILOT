import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Fraunces, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/layout/demo-banner";
import { ClientBootstrap } from "@/components/layout/providers";
import { Toaster } from "@/components/ui/toaster";
import { getAppUrl } from "@/lib/env";
import { routing } from "@/lib/i18n/routing";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz"] });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale, namespace: "meta" });
  return {
    metadataBase: new URL(getAppUrl()),
    title: { default: t("defaultTitle"), template: "%s · CookPilot" },
    description: t("defaultDescription"),
    applicationName: "CookPilot",
    appleWebApp: { capable: true, title: "CookPilot", statusBarStyle: "default" },
    formatDetection: { telephone: false },
    icons: { icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }], apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = {
  themeColor: "#faf6ee",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh">
        <NextIntlClientProvider>
          <DemoBanner />
          {children}
          <Toaster />
          <ClientBootstrap />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
