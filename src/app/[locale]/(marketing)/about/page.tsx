import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { asLocale } from "@/lib/i18n/locale";
import { Link } from "@/lib/i18n/navigation";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "about" });
  return buildMetadata({ locale, path: "/about", title: t("metaTitle"), description: t("intro") });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const principles = ["exact", "honest", "safe", "independent"] as const;
  return (
    <div className="container-page max-w-3xl py-16">
      <p className="eyebrow mb-3">{t("eyebrow")}</p>
      <h1 className="text-5xl md:text-6xl">{t("title")}</h1>
      <p className="mt-6 text-xl leading-relaxed text-muted">{t("intro")}</p>
      <p className="mt-6 leading-relaxed">{t("story")}</p>
      <h2 className="mb-6 mt-14 text-3xl">{t("principlesTitle")}</h2>
      <dl className="space-y-6">
        {principles.map((p) => (
          <div key={p} className="rounded-xl border border-border bg-surface p-6">
            <dt className="font-serif text-xl">{t(`principles.${p}.title`)}</dt>
            <dd className="mt-2 leading-relaxed text-muted">{t(`principles.${p}.body`)}</dd>
          </div>
        ))}
      </dl>
      <Button asChild size="lg" className="mt-12"><Link href="/register">{t("cta")}<ArrowRight /></Link></Button>
    </div>
  );
}
