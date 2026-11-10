import { getTranslations } from "next-intl/server";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { PageHeader } from "@/components/ui/states";
import { appPage } from "@/lib/page-context";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, user, store } = await appPage(params);
  const t = await getTranslations("settings");
  const prefs = await store.getPreferences(user.id);
  return (
    <div className="max-w-3xl">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <SettingsForm
        key={locale}
        email={user.email}
        isDemo={user.isDemo}
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
    </div>
  );
}
