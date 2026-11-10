import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DeviceSheet, DeviceSummary } from "@/components/devices/device-bits";
import { DevicePicker } from "@/components/devices/device-picker";
import { PageHeader } from "@/components/ui/states";
import { getEntitlements } from "@/lib/billing/entitlements";
import { Link } from "@/lib/i18n/navigation";
import { appPage } from "@/lib/page-context";

export default async function AddDevicePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ model?: string }> }) {
  const { user, store } = await appPage(params);
  const t = await getTranslations("devices");
  const { model: slug } = await searchParams;
  const [models, brands, categories, devices, { limits }, prefs] = await Promise.all([
    store.listDeviceModels(),
    store.listBrands(),
    store.listCategories(),
    store.listUserDevices(user.id),
    getEntitlements(store, user.id),
    store.getPreferences(user.id),
  ]);
  const preview = slug ? models.find((m) => m.slug === slug) : undefined;

  if (preview) {
    return (
      <>
        <Link href="/dashboard/devices/add" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft className="size-4" />{t("backToCatalogue")}</Link>
        <div className="mb-8 rounded-xl border border-border bg-surface p-5"><DeviceSummary model={preview} /></div>
        <DeviceSheet model={preview} unit={prefs.temperatureUnit} />
        <div className="mt-10">
          <DevicePicker models={[preview]} brands={[]} categories={[]} ownedModelIds={devices.map((d) => d.modelId)} maxDevices={limits.maxDevices} showSpecs={false} />
        </div>
      </>
    );
  }

  return (
    <>
      <Link href="/dashboard/devices" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft className="size-4" />{t("backToDevices")}</Link>
      <PageHeader title={t("addTitle")} description={t("addSubtitle")} />
      <DevicePicker models={models} brands={brands} categories={categories} ownedModelIds={devices.map((d) => d.modelId)} maxDevices={limits.maxDevices} />
    </>
  );
}
