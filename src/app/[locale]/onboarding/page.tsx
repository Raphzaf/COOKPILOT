import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OnboardingWizard } from "@/components/dashboard/onboarding-wizard";
import { requireUser } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/billing/entitlements";
import { getStore } from "@/lib/data";
import { asLocale } from "@/lib/i18n/locale";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: asLocale((await params).locale), namespace: "onboarding" });
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const store = await getStore();
  const [models, brands, categories, devices, prefs, { limits }] = await Promise.all([
    store.listDeviceModels(),
    store.listBrands(),
    store.listCategories(),
    store.listUserDevices(user.id),
    store.getPreferences(user.id),
    getEntitlements(store, user.id),
  ]);
  return (
    <OnboardingWizard
      // Remount when the language changes so every label follows the new locale.
      key={locale}
      models={models}
      brands={brands}
      categories={categories}
      ownedModelIds={devices.map((d) => d.modelId)}
      maxDevices={limits.maxDevices}
      initial={{
        displayName: user.profile.displayName ?? "",
        locale,
        measurementSystem: prefs.measurementSystem,
        temperatureUnit: prefs.temperatureUnit,
        servings: prefs.servings,
        cuisines: prefs.cuisines.join(", "),
        allergies: prefs.allergies.join(", "),
        diets: prefs.diets,
        dislikes: prefs.dislikes.join(", "),
        experience: prefs.experience,
      }}
    />
  );
}
