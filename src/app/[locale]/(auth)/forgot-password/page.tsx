import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { asLocale } from "@/lib/i18n/locale";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "auth" });
  return buildMetadata({ locale, path: "/forgot-password", title: t("titles.forgot"), description: t("subtitles.forgot"), index: false });
}

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const { error } = await searchParams;
  return (
    <AuthShell title={t("titles.forgot")} subtitle={t("subtitles.forgot")}>
      <AuthForm mode="forgot" initialError={Boolean(error)} />
    </AuthShell>
  );
}
