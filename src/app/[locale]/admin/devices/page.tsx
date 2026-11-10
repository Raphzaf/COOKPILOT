import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DeviceForm } from "@/components/admin/device-form";
import { VerificationBadge } from "@/components/devices/device-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/states";
import { adminPage } from "@/lib/admin-page";
import { Link } from "@/lib/i18n/navigation";

export default async function AdminDevices({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ edit?: string }> }) {
  const { store } = await adminPage(params);
  const t = await getTranslations("admin.devices");
  const { edit } = await searchParams;
  const [models, brands, categories] = await Promise.all([store.listDeviceModels({ includeUnpublished: true }), store.listBrands(), store.listCategories()]);
  const editing = edit && edit !== "new" ? (models.find((m) => m.id === edit) ?? null) : null;
  if (edit) {
    return (
      <>
        <PageHeader title={editing ? t("editTitle", { model: editing.modelNumber }) : t("newTitle")} description={t("formIntro")} actions={<Button asChild variant="secondary"><Link href="/admin/devices">{t("backToList")}</Link></Button>} />
        <DeviceForm key={editing?.id ?? "new"} model={editing} brands={brands} categories={categories} />
      </>
    );
  }
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} actions={<Button asChild><Link href="/admin/devices?edit=new"><Plus />{t("new")}</Link></Button>} />
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[40rem] text-sm">
          <thead><tr className="border-b border-border text-left text-xs text-muted"><th className="px-4 py-3 font-medium">{t("model")}</th><th className="px-4 py-3 font-medium">{t("category")}</th><th className="px-4 py-3 font-medium">{t("programs")}</th><th className="px-4 py-3 font-medium">{t("verification")}</th><th className="px-4 py-3 font-medium">{t("visibility")}</th><th /></tr></thead>
          <tbody className="divide-y divide-border">
            {models.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3"><span className="font-medium">{m.brand.name} {m.modelNumber}</span> <span className="text-muted">{m.name} · {m.region}</span></td>
                <td className="px-4 py-3 text-muted">{m.category.name.en}</td>
                <td className="px-4 py-3 tabular-nums">{m.capabilities.filter((c) => c.kind === "program").length}</td>
                <td className="px-4 py-3"><VerificationBadge status={m.verificationStatus} /></td>
                <td className="px-4 py-3"><Badge variant={m.published ? "olive" : "neutral"}>{m.published ? t("isPublished") : t("isHidden")}</Badge></td>
                <td className="px-4 py-3 text-right"><Button asChild variant="ghost" size="sm"><Link href={`/admin/devices?edit=${m.id}`}>{t("edit")}</Link></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
