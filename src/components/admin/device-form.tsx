"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteDeviceAction, saveDeviceAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { FieldHint, Input, Label, Select, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { formatCapabilities, formatI18nLines, formatSources, formatSpecs } from "@/lib/admin/parse";
import type { Brand, DeviceCategory, DeviceModel } from "@/lib/domain/types";
import { useRouter } from "@/lib/i18n/navigation";

export function DeviceForm({ model, brands, categories }: { model: DeviceModel | null; brands: Brand[]; categories: DeviceCategory[] }) {
  const t = useTranslations("admin.devices");
  const c = useTranslations("common");
  const v = useTranslations("verification");
  const e = useTranslations("errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    brandId: model?.brand.id ?? brands[0]?.id ?? "",
    categoryId: model?.category.id ?? categories[0]?.id ?? "",
    name: model?.name ?? "",
    modelNumber: model?.modelNumber ?? "",
    region: model?.region ?? "EU",
    descriptionEn: model?.description.en ?? "",
    descriptionFr: model?.description.fr ?? "",
    imageUrl: model?.imageUrl ?? "",
    specs: model ? formatSpecs(model.specs) : "",
    missingInfo: model ? formatI18nLines(model.missingInfo) : "",
    capabilities: model ? formatCapabilities(model.capabilities) : "",
    sources: model ? formatSources(model.sources) : "",
    verificationStatus: model?.verificationStatus ?? ("incomplete" as const),
    published: model?.published ?? false,
  });
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => setF((prev) => ({ ...prev, [key]: value }));

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    start(async () => {
      const result = await saveDeviceAction({ id: model?.id, ...f });
      if (!result.ok) return void toast.error(result.error === "INVALID_INPUT" ? t("invalid") : e(result.error));
      toast.success(c("saved"));
      router.replace("/admin/devices");
      router.refresh();
    });
  };
  const remove = () =>
    start(async () => {
      if (!model || !window.confirm(t("confirmDelete", { model: model.modelNumber }))) return;
      const result = await deleteDeviceAction(model.id);
      if (!result.ok) return void toast.error(e(result.error));
      router.replace("/admin/devices");
      router.refresh();
    });

  return (
    <form onSubmit={save} className="space-y-5 rounded-xl border border-border bg-surface p-5 md:p-6" data-testid="device-form">
      <div className="grid gap-4 md:grid-cols-4">
        <div><Label htmlFor="d-brand">{t("brand")}</Label><Select id="d-brand" value={f.brandId} onChange={(ev) => set("brandId", ev.target.value)}>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></div>
        <div><Label htmlFor="d-cat">{t("category")}</Label><Select id="d-cat" value={f.categoryId} onChange={(ev) => set("categoryId", ev.target.value)}>{categories.map((x) => <option key={x.id} value={x.id}>{x.name.en}</option>)}</Select></div>
        <div><Label htmlFor="d-number">{t("modelNumber")}</Label><Input id="d-number" required value={f.modelNumber} onChange={(ev) => set("modelNumber", ev.target.value)} /></div>
        <div><Label htmlFor="d-region">{t("region")}</Label><Input id="d-region" required value={f.region} onChange={(ev) => set("region", ev.target.value)} /></div>
      </div>
      <div><Label htmlFor="d-name">{t("name")}</Label><Input id="d-name" required value={f.name} onChange={(ev) => set("name", ev.target.value)} /></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label htmlFor="d-en">{t("descriptionEn")}</Label><Textarea id="d-en" value={f.descriptionEn} onChange={(ev) => set("descriptionEn", ev.target.value)} /></div>
        <div><Label htmlFor="d-fr">{t("descriptionFr")}</Label><Textarea id="d-fr" value={f.descriptionFr} onChange={(ev) => set("descriptionFr", ev.target.value)} /></div>
      </div>
      <div><Label htmlFor="d-caps">{t("capabilities")}</Label><Textarea id="d-caps" className="min-h-40 font-mono text-xs" value={f.capabilities} onChange={(ev) => set("capabilities", ev.target.value)} /><FieldHint>{t("capabilitiesHint")}</FieldHint></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label htmlFor="d-specs">{t("specs")}</Label><Textarea id="d-specs" className="min-h-28 font-mono text-xs" value={f.specs} onChange={(ev) => set("specs", ev.target.value)} /><FieldHint>{t("specsHint")}</FieldHint></div>
        <div><Label htmlFor="d-missing">{t("missingInfo")}</Label><Textarea id="d-missing" className="min-h-28 font-mono text-xs" value={f.missingInfo} onChange={(ev) => set("missingInfo", ev.target.value)} /><FieldHint>{t("missingInfoHint")}</FieldHint></div>
      </div>
      <div><Label htmlFor="d-sources">{t("sources")}</Label><Textarea id="d-sources" className="min-h-24 font-mono text-xs" value={f.sources} onChange={(ev) => set("sources", ev.target.value)} /><FieldHint>{t("sourcesHint")}</FieldHint></div>
      <div><Label htmlFor="d-image">{t("imageUrl")}</Label><Input id="d-image" type="url" value={f.imageUrl} onChange={(ev) => set("imageUrl", ev.target.value)} placeholder="https://" /><FieldHint>{t("imageHint")}</FieldHint></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="d-status">{t("verification")}</Label>
          <Select id="d-status" value={f.verificationStatus} onChange={(ev) => set("verificationStatus", ev.target.value as typeof f.verificationStatus)}>
            {(["incomplete", "partial", "documented", "verified"] as const).map((s) => <option key={s} value={s}>{v(`${s}.label`)}</option>)}
          </Select>
          <FieldHint>{v(`${f.verificationStatus}.description`)}</FieldHint>
        </div>
        <label className="flex items-center gap-3 self-center text-sm"><input type="checkbox" className="size-5 accent-[#55622f]" checked={f.published} onChange={(ev) => set("published", ev.target.checked)} />{t("published")}</label>
      </div>
      <div className="flex flex-wrap justify-between gap-3">
        <Button type="submit" disabled={pending}>{pending ? <Spinner /> : null}{c("save")}</Button>
        {model ? <Button variant="ghost" className="text-destructive" onClick={remove} disabled={pending}><Trash2 />{c("delete")}</Button> : null}
      </div>
    </form>
  );
}
