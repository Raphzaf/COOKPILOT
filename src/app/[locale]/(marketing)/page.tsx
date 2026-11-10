import { ArrowRight, BadgeCheck, BookOpen, ChefHat, CookingPot, Languages, MessageCircle, ShieldCheck, SlidersHorizontal, Sparkles, Timer } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DeviceSummary } from "@/components/devices/device-bits";
import { PublicPricing } from "@/components/marketing/public-pricing";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { RecipeArt } from "@/components/recipes/recipe-art";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { annualSavingsPercent, PRICING } from "@/lib/billing/plans";
import { getPublicStore } from "@/lib/data";
import { Link } from "@/lib/i18n/navigation";
import { asLocale } from "@/lib/i18n/locale";
import { absoluteUrl, buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildMetadata({ locale, path: "/", title: t("homeTitle"), description: t("defaultDescription") });
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const store = getPublicStore();
  const [devices, recipes] = await Promise.all([store.listDeviceModels(), store.listRecipes(locale)]);
  const features = [
    { icon: SlidersHorizontal, key: "appliance" },
    { icon: MessageCircle, key: "chef" },
    { icon: BadgeCheck, key: "provenance" },
    { icon: Timer, key: "cooking" },
    { icon: ShieldCheck, key: "safety" },
    { icon: Languages, key: "bilingual" },
  ] as const;
  const steps = [
    { icon: CookingPot, key: "add" },
    { icon: Sparkles, key: "ask" },
    { icon: ChefHat, key: "cook" },
  ] as const;
  const faq = ["official", "models", "tested", "free", "data", "cancel"] as const;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "CookPilot",
    url: absoluteUrl(`/${locale}`),
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    description: t("hero.subtitle"),
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: PRICING.currency },
      { "@type": "Offer", name: "Pro (monthly)", price: String(PRICING.proMonthly), priceCurrency: PRICING.currency },
      { "@type": "Offer", name: "Pro (annual)", price: String(PRICING.proAnnual), priceCurrency: PRICING.currency },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* Hero */}
      <section className="container-page grid items-center gap-12 pb-16 pt-14 md:pt-20 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="eyebrow mb-5">{t("hero.eyebrow")}</p>
          <h1 className="text-5xl leading-[1.05] md:text-6xl lg:text-7xl">
            {t("hero.title1")}<br />{t("hero.title2")}<br /><span className="italic text-primary">{t("hero.title3")}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">{t("hero.subtitle")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/register">{t("hero.cta")}<ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href="/recipes"><BookOpen />{t("hero.secondary")}</Link></Button>
          </div>
          <p className="mt-5 text-sm text-subtle">{t("hero.note")}</p>
        </div>

        {/* Product illustration: an example of how an answer is structured (not a real conversation). */}
        <div className="relative" aria-hidden>
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-sunken" />
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
            <div className="aspect-[16/10]"><RecipeArt kind="steak" /></div>
            <div className="space-y-4 p-6">
              <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-sm text-surface">{t("hero.exampleQuestion")}</div>
              <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-background px-4 py-3 text-sm">
                <p>{t("hero.exampleAnswer")}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="olive">Grill · HIGH</Badge>
                  <Badge variant="neutral">{t("hero.exampleTime")}</Badge>
                  <Badge variant="amber">{t("hero.exampleLabel")}</Badge>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-subtle">{t("hero.exampleCaption")}</p>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-border bg-surface py-20" aria-labelledby="features-title">
        <div className="container-page">
          <p className="eyebrow mb-3">{t("features.eyebrow")}</p>
          <h2 id="features-title" className="max-w-2xl text-4xl md:text-5xl">{t("features.title")}</h2>
          <div className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, key }) => (
              <div key={key}>
                <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Icon className="size-5" /></span>
                <h3 className="text-xl">{t(`features.${key}.title`)}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{t(`features.${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-20" aria-labelledby="how-title">
        <p className="eyebrow mb-3">{t("how.eyebrow")}</p>
        <h2 id="how-title" className="max-w-2xl text-4xl md:text-5xl">{t("how.title")}</h2>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, key }, i) => (
            <li key={key} className="rounded-2xl border border-border bg-surface p-7">
              <div className="flex items-center justify-between">
                <span className="font-serif text-5xl text-border-strong">{i + 1}</span>
                <Icon className="size-6 text-primary" />
              </div>
              <h3 className="mt-6 text-xl">{t(`how.${key}.title`)}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{t(`how.${key}.body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Supported appliances — real catalogue data */}
      <section id="appliances" className="scroll-mt-20 border-y border-border bg-surface py-20" aria-labelledby="appliances-title">
        <div className="container-page">
          <p className="eyebrow mb-3">{t("appliances.eyebrow")}</p>
          <h2 id="appliances-title" className="max-w-2xl text-4xl md:text-5xl">{t("appliances.title")}</h2>
          <p className="mt-4 max-w-2xl text-muted">{t("appliances.body")}</p>
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {devices.map((model) => (
              <li key={model.id} className="rounded-xl border border-border bg-background p-5"><DeviceSummary model={model} /></li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted">{t("appliances.more")}</p>
        </div>
      </section>

      {/* Recipes */}
      <section className="container-page py-20" aria-labelledby="recipes-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">{t("recipes.eyebrow")}</p>
            <h2 id="recipes-title" className="max-w-2xl text-4xl md:text-5xl">{t("recipes.title")}</h2>
          </div>
          <Button asChild variant="secondary"><Link href="/recipes">{t("recipes.all")}<ArrowRight /></Link></Button>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.slice(0, 3).map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} href={`/recipes/${recipe.slug}`} />)}
        </div>
      </section>

      {/* Pricing */}
      <section className="border-y border-border bg-surface py-20" aria-labelledby="pricing-title">
        <div className="container-page">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="eyebrow mb-3">{t("pricing.eyebrow")}</p>
            <h2 id="pricing-title" className="text-4xl md:text-5xl">{t("pricing.title")}</h2>
          </div>
          <PublicPricing monthly={PRICING.proMonthly} annual={PRICING.proAnnual} savings={annualSavingsPercent()} currency={PRICING.currency} />
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page max-w-3xl py-20" aria-labelledby="faq-title">
        <h2 id="faq-title" className="mb-6 text-4xl md:text-5xl">{t("faq.title")}</h2>
        <Accordion type="single" collapsible>
          {faq.map((key) => (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger>{t(`faq.${key}.q`)}</AccordionTrigger>
              <AccordionContent>{t(`faq.${key}.a`)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="container-page">
        <div className="rounded-3xl bg-foreground px-6 py-16 text-center text-surface md:px-16">
          <h2 className="mx-auto max-w-2xl text-4xl md:text-5xl">{t("cta.title")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-[#cfcbbd]">{t("cta.body")}</p>
          <Button asChild size="lg" className="mt-8 bg-surface text-foreground hover:bg-sunken"><Link href="/register">{t("cta.button")}<ArrowRight /></Link></Button>
        </div>
      </section>
    </>
  );
}
