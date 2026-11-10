import { CookingPot, Plus, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DeviceSummary } from "@/components/devices/device-bits";
import { MissingDeviceDialog } from "@/components/devices/device-picker";
import { Button } from "@/components/ui/button";
import { EmptyState, Notice, PageHeader } from "@/components/ui/states";
import { getEntitlements } from "@/lib/billing/entitlements";
import { canAddDevice } from "@/lib/billing/plans";
import { Link } from "@/lib/i18n/navigation";
import { appPage } from "@/lib/page-context";

export default async function DevicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { user, store } = await appPage(params);
  const t = await getTranslations("devices");
  const [devices, { plan, limits }] = await Promise.all([store.listUserDevices(user.id), getEntitlements(store, user.id)]);
  const canAdd = canAddDevice(plan, devices.length);
  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <>
            <MissingDeviceDialog trigger={<Button variant="secondary">{t("missing.cta")}</Button>} />
            <Button asChild><Link href="/dashboard/devices/add"><Plus />{t("addDevice")}</Link></Button>
          </>
        }
      />
      {!canAdd ? (
        <Notice tone="warning" className="mb-6">
          {t("limitReached", { count: limits.maxDevices ?? 0 })}{" "}
          <Link href="/dashboard/subscription" className="font-medium underline">{t("upgrade")}</Link>
        </Notice>
      ) : null}
      {devices.length === 0 ? (
        <EmptyState icon={CookingPot} title={t("emptyTitle")} description={t("emptyBody")} action={<Button asChild><Link href="/dashboard/devices/add"><Plus />{t("addDevice")}</Link></Button>} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2" data-testid="my-devices">
          {devices.map((d) => (
            <li key={d.id}>
              <Link href={`/dashboard/devices/${d.id}`} className="relative block rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-strong">
                {d.isFavorite ? <Star className="absolute right-4 top-4 size-4 fill-[#d9a520] text-[#d9a520]" aria-label={t("favoriteOn")} /> : null}
                <DeviceSummary model={d.model}>{d.nickname ? <p className="mt-2 text-sm text-muted">“{d.nickname}”</p> : null}</DeviceSummary>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
