import { ArrowLeft, ChefHat } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { DeviceSheet, DeviceSummary } from "@/components/devices/device-bits";
import { DeviceManage } from "@/components/devices/device-manage";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
import { appPage } from "@/lib/page-context";
import { checkCompatibility } from "@/lib/recipes/compatibility";

export default async function DevicePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, user, store } = await appPage(params);
  const { id } = await params;
  const device = await store.getUserDevice(user.id, id);
  if (!device) notFound();
  const t = await getTranslations("devices");
  const [prefs, recipes] = await Promise.all([store.getPreferences(user.id), store.listRecipes(locale, { deviceCategory: device.model.category.slug })]);
  const compatible = recipes.filter((r) => ["compatible", "tested"].includes(checkCompatibility(r, device.model).level));
  const label = `${device.model.brand.name} ${device.model.modelNumber}`;
  return (
    <>
      <Link href="/dashboard/devices" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft className="size-4" />{t("backToDevices")}</Link>
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 md:flex-row md:items-center md:justify-between">
        <DeviceSummary model={device.model} />
        <Button asChild><Link href={`/dashboard/chef?q=${encodeURIComponent(t("askAbout", { model: label }))}`}><ChefHat />{t("askChef")}</Link></Button>
      </div>
      <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <DeviceSheet model={device.model} unit={prefs.temperatureUnit} />
        <div className="space-y-6">
          <DeviceManage id={device.id} nickname={device.nickname} isFavorite={device.isFavorite} label={label} />
        </div>
      </div>
      {compatible.length > 0 ? (
        <section className="mt-14" aria-labelledby="device-recipes">
          <h2 id="device-recipes" className="mb-5 text-2xl">{t("recipesFor", { model: label })}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {compatible.slice(0, 6).map((r) => <RecipeCard key={r.id} recipe={r} href={`/dashboard/recipes/${r.id}`} />)}
          </div>
        </section>
      ) : null}
    </>
  );
}
