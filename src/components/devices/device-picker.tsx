"use client";

import { Check, Plus, Search, SearchX, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { addDeviceAction, submitSupportRequestAction } from "@/actions/user";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Notice, Spinner } from "@/components/ui/states";
import type { Brand, DeviceCategory, DeviceModel, Locale } from "@/lib/domain/types";
import { Link } from "@/lib/i18n/navigation";
import { normalizeText } from "@/lib/utils";
import { DeviceSummary } from "./device-bits";

export function MissingDeviceDialog({ trigger }: { trigger: React.ReactNode }) {
  const t = useTranslations("devices");
  const c = useTranslations("common");
  const e = useTranslations("errors");
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState("");
  const [details, setDetails] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent closeLabel={c("close")}>
        <DialogTitle>{t("missing.title")}</DialogTitle>
        <DialogDescription>{t("missing.description")}</DialogDescription>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            start(async () => {
              const result = await submitSupportRequestAction({ kind: "missing_device", subject: model, message: details || model });
              if (!result.ok) return void toast.error(e(result.error));
              toast.success(t("missing.sent"));
              setOpen(false);
              setModel("");
              setDetails("");
            });
          }}
        >
          <div>
            <Label htmlFor="missing-model">{t("missing.model")}</Label>
            <Input id="missing-model" required minLength={2} maxLength={200} value={model} onChange={(ev) => setModel(ev.target.value)} placeholder={t("missing.modelPlaceholder")} />
          </div>
          <div>
            <Label htmlFor="missing-details">{t("missing.details")}</Label>
            <Textarea id="missing-details" maxLength={2000} value={details} onChange={(ev) => setDetails(ev.target.value)} placeholder={t("missing.detailsPlaceholder")} />
          </div>
          <Button type="submit" disabled={pending || model.trim().length < 2}>{pending ? <Spinner /> : <Send />}{t("missing.submit")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DevicePicker({
  models,
  brands,
  categories,
  ownedModelIds,
  maxDevices,
  onChange,
  showSpecs = true,
}: {
  models: DeviceModel[];
  brands: Brand[];
  categories: DeviceCategory[];
  ownedModelIds: string[];
  /** null = unlimited */
  maxDevices: number | null;
  onChange?: (ownedModelIds: string[]) => void;
  showSpecs?: boolean;
}) {
  const t = useTranslations("devices");
  const e = useTranslations("errors");
  const locale = useLocale() as Locale;
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [owned, setOwned] = useState(ownedModelIds);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, start] = useTransition();

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    return models.filter(
      (m) =>
        (!brand || m.brand.slug === brand) &&
        (!category || m.category.slug === category) &&
        (!q || normalizeText(`${m.brand.name} ${m.name} ${m.modelNumber} ${m.region} ${m.category.name[locale]}`).includes(q)),
    );
  }, [models, query, brand, category, locale]);

  const limitReached = maxDevices != null && owned.length >= maxDevices;

  const add = (model: DeviceModel) => {
    setPendingId(model.id);
    start(async () => {
      const result = await addDeviceAction(model.id);
      setPendingId(null);
      if (!result.ok) return void toast.error(e(result.error));
      const next = [...owned, model.id];
      setOwned(next);
      onChange?.(next);
      toast.success(t("added", { model: `${model.brand.name} ${model.modelNumber}` }));
    });
  };

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input type="search" value={query} onChange={(ev) => setQuery(ev.target.value)} placeholder={t("searchPlaceholder")} aria-label={t("searchPlaceholder")} className="pl-10" />
        </div>
        <Select value={brand} onChange={(ev) => setBrand(ev.target.value)} aria-label={t("manufacturer")}>
          <option value="">{t("allManufacturers")}</option>
          {brands.map((b) => <option key={b.id} value={b.slug}>{b.name}</option>)}
        </Select>
        <Select value={category} onChange={(ev) => setCategory(ev.target.value)} aria-label={t("category")}>
          <option value="">{t("allCategories")}</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name[locale]}</option>)}
        </Select>
      </div>

      {limitReached ? (
        <Notice tone="warning" className="mt-4">
          {t("limitReached", { count: maxDevices ?? 0 })}{" "}
          <Link href="/dashboard/subscription" className="font-medium underline">{t("upgrade")}</Link>
        </Notice>
      ) : null}

      <ul className="mt-4 space-y-3" data-testid="device-results">
        {filtered.map((model) => {
          const isOwned = owned.includes(model.id);
          return (
            <li key={model.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <DeviceSummary model={model} />
              <div className="flex shrink-0 gap-2 self-end sm:self-center">
                {showSpecs ? <Button asChild variant="ghost" size="sm"><Link href={`/dashboard/devices/add?model=${model.slug}`}>{t("viewSpecs")}</Link></Button> : null}
                {isOwned ? (
                  <Button variant="soft" size="sm" disabled><Check />{t("inKitchen")}</Button>
                ) : (
                  <Button size="sm" onClick={() => add(model)} disabled={limitReached || pendingId !== null} data-testid={`add-${model.modelNumber}`}>
                    {pendingId === model.id ? <Spinner /> : <Plus />}
                    {t("add")}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-border-strong px-6 py-10 text-center">
          <SearchX className="mb-3 size-6 text-muted" />
          <p className="font-medium">{t("noResults")}</p>
          <p className="mt-1 max-w-sm text-sm text-muted">{t("noResultsHint")}</p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sunken px-4 py-3 text-sm">
        <p className="text-muted">{t("missing.prompt")}</p>
        <MissingDeviceDialog trigger={<Button variant="secondary" size="sm">{t("missing.cta")}</Button>} />
      </div>
    </div>
  );
}
