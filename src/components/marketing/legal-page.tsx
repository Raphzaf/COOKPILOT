import { getTranslations } from "next-intl/server";
import type { LegalDocument } from "@/content/legal";
import type { Locale } from "@/lib/domain/types";
import { intlLocale } from "@/lib/i18n/locale";

export async function LegalPage({ document, locale }: { document: LegalDocument; locale: Locale }) {
  const t = await getTranslations("common");
  const date = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long" }).format(new Date(document.updated));
  return (
    <div className="container-page max-w-3xl py-16">
      <h1 className="text-5xl">{document.title}</h1>
      <p className="mt-3 text-sm text-subtle">{t("lastUpdated", { date })}</p>
      <p className="mt-8 text-lg text-muted">{document.intro}</p>
      {document.sections.map((section) => (
        <section key={section.heading} className="mt-10">
          <h2 className="mb-3 text-2xl">{section.heading}</h2>
          {section.paragraphs.map((p, i) => <p key={i} className="mb-3 leading-relaxed text-foreground/85">{p}</p>)}
        </section>
      ))}
    </div>
  );
}
