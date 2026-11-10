"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveRecipeAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { FieldHint, Input, Label, Select, Textarea } from "@/components/ui/input";
import { Notice, Spinner } from "@/components/ui/states";
import type { RecipeInput } from "@/lib/data/store";
import { formatIngredients, formatSteps } from "@/lib/admin/parse";
import type { DeviceCategory, DeviceModel, Locale } from "@/lib/domain/types";
import { useRouter } from "@/lib/i18n/navigation";
import { DIETS, RECIPE_CATEGORIES } from "@/lib/recipes/filter";
import { cn } from "@/lib/utils";

export function RecipeForm({ input, editLocale, models, categories }: { input: RecipeInput | null; editLocale: Locale; models: DeviceModel[]; categories: DeviceCategory[] }) {
  const t = useTranslations("admin.recipes");
  const c = useTranslations("common");
  const p = useTranslations("provenance");
  const r = useTranslations("recipes");
  const e = useTranslations("errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const content = input?.translations[editLocale];
  const meta = input?.meta;
  const [f, setF] = useState({
    slug: meta?.slug ?? "",
    title: content?.title ?? "",
    description: content?.description ?? "",
    coverImage: meta?.coverImage ?? "",
    category: meta?.category ?? "main",
    cuisine: meta?.cuisine ?? "",
    dietary: meta?.dietary ?? [],
    servings: meta?.servings ?? 2,
    prepMinutes: meta?.prepMinutes ?? 10,
    cookMinutes: meta?.cookMinutes ?? 20,
    difficulty: meta?.difficulty ?? ("easy" as const),
    deviceCategory: meta?.deviceCategory ?? categories[0]?.slug ?? "",
    provenance: meta?.provenance ?? ("generated" as const),
    status: (meta?.status === "published" || meta?.status === "archived" ? meta.status : "draft") as "draft" | "published" | "archived",
    compatibleModelIds: meta?.compatibility.map((x) => x.deviceModelId) ?? [],
    testedModelIds: meta?.compatibility.filter((x) => x.tested).map((x) => x.deviceModelId) ?? [],
    ingredients: content ? formatIngredients(content.ingredients) : "",
    steps: content ? formatSteps(content.steps) : "",
    accessories: content?.accessories.join("\n") ?? "",
    safetyNotes: content?.safetyNotes.join("\n") ?? "",
    sourceNote: content?.sourceNote ?? "",
  });
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => setF((prev) => ({ ...prev, [key]: value }));
  const toggle = (key: "compatibleModelIds" | "testedModelIds" | "dietary", id: string) => set(key, f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id]);
  const eligible = models.filter((m) => m.category.slug === f.deviceCategory);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    start(async () => {
      const result = await saveRecipeAction({ id: input?.id, locale: editLocale, ...f });
      if (!result.ok) return void toast.error(result.error === "INVALID_INPUT" ? t("invalid") : e(result.error));
      toast.success(c("saved"));
      router.replace("/admin/recipes");
      router.refresh();
    });
  };

  return (
    <form onSubmit={save} className="space-y-5 rounded-xl border border-border bg-surface p-5 md:p-6" data-testid="recipe-form">
      {input && !content ? <Notice tone="warning">{t("missingTranslation", { locale: editLocale.toUpperCase() })}</Notice> : null}
      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <div><Label htmlFor="r-title">{t("titleField", { locale: editLocale.toUpperCase() })}</Label><Input id="r-title" required value={f.title} onChange={(ev) => set("title", ev.target.value)} /></div>
        <div><Label htmlFor="r-slug">{t("slug")}</Label><Input id="r-slug" value={f.slug} onChange={(ev) => set("slug", ev.target.value)} placeholder={t("slugPlaceholder")} /></div>
      </div>
      <div><Label htmlFor="r-desc">{t("description")}</Label><Textarea id="r-desc" value={f.description} onChange={(ev) => set("description", ev.target.value)} /></div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        <div><Label htmlFor="r-cat">{t("category")}</Label><Select id="r-cat" value={f.category} onChange={(ev) => set("category", ev.target.value)}>{RECIPE_CATEGORIES.map((x) => <option key={x} value={x}>{r(`categories.${x}`)}</option>)}</Select></div>
        <div><Label htmlFor="r-cuisine">{t("cuisine")}</Label><Input id="r-cuisine" value={f.cuisine} onChange={(ev) => set("cuisine", ev.target.value)} /></div>
        <div><Label htmlFor="r-servings">{t("servings")}</Label><Input id="r-servings" type="number" min={1} max={24} value={f.servings} onChange={(ev) => set("servings", Number(ev.target.value))} /></div>
        <div><Label htmlFor="r-prep">{t("prep")}</Label><Input id="r-prep" type="number" min={0} value={f.prepMinutes} onChange={(ev) => set("prepMinutes", Number(ev.target.value))} /></div>
        <div><Label htmlFor="r-cook">{t("cook")}</Label><Input id="r-cook" type="number" min={0} value={f.cookMinutes} onChange={(ev) => set("cookMinutes", Number(ev.target.value))} /></div>
        <div><Label htmlFor="r-diff">{t("difficulty")}</Label><Select id="r-diff" value={f.difficulty} onChange={(ev) => set("difficulty", ev.target.value as typeof f.difficulty)}>{(["easy", "medium", "advanced"] as const).map((x) => <option key={x} value={x}>{r(`difficulty.${x}`)}</option>)}</Select></div>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">{t("dietary")}</legend>
        <div className="flex flex-wrap gap-2">
          {DIETS.map((d) => <button key={d} type="button" aria-pressed={f.dietary.includes(d)} onClick={() => toggle("dietary", d)} className={cn("cursor-pointer rounded-full border px-3 py-1 text-sm", f.dietary.includes(d) ? "border-primary bg-accent" : "border-border-strong")}>{r(`diets.${d}`)}</button>)}
        </div>
      </fieldset>
      <div><Label htmlFor="r-ing">{t("ingredients")}</Label><Textarea id="r-ing" required className="min-h-40 font-mono text-xs" value={f.ingredients} onChange={(ev) => set("ingredients", ev.target.value)} /><FieldHint>{t("ingredientsHint")}</FieldHint></div>
      <div><Label htmlFor="r-steps">{t("steps")}</Label><Textarea id="r-steps" required className="min-h-48 font-mono text-xs" value={f.steps} onChange={(ev) => set("steps", ev.target.value)} /><FieldHint>{t("stepsHint")}</FieldHint></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label htmlFor="r-acc">{t("accessories")}</Label><Textarea id="r-acc" value={f.accessories} onChange={(ev) => set("accessories", ev.target.value)} /><FieldHint>{t("onePerLine")}</FieldHint></div>
        <div><Label htmlFor="r-safety">{t("safetyNotes")}</Label><Textarea id="r-safety" value={f.safetyNotes} onChange={(ev) => set("safetyNotes", ev.target.value)} /><FieldHint>{t("onePerLine")}</FieldHint></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label htmlFor="r-device">{t("deviceCategory")}</Label><Select id="r-device" value={f.deviceCategory} onChange={(ev) => setF((prev) => ({ ...prev, deviceCategory: ev.target.value, compatibleModelIds: [], testedModelIds: [] }))}>{categories.map((x) => <option key={x.slug} value={x.slug}>{x.name.en}</option>)}</Select></div>
        <div><Label htmlFor="r-cover">{t("coverImage")}</Label><Input id="r-cover" type="url" value={f.coverImage} onChange={(ev) => set("coverImage", ev.target.value)} placeholder="https://" /><FieldHint>{t("coverHint")}</FieldHint></div>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">{t("compatibility")}</legend>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {eligible.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-[#55622f]" checked={f.compatibleModelIds.includes(m.id)} onChange={() => toggle("compatibleModelIds", m.id)} />{m.brand.name} {m.modelNumber} <span className="text-muted">{m.region}</span></label>
              <label className="flex items-center gap-2 text-muted"><input type="checkbox" className="size-4 accent-[#55622f]" disabled={!f.compatibleModelIds.includes(m.id)} checked={f.testedModelIds.includes(m.id)} onChange={() => toggle("testedModelIds", m.id)} />{t("testedOnThisModel")}</label>
            </li>
          ))}
        </ul>
        <FieldHint>{t("compatibilityHint")}</FieldHint>
      </fieldset>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="r-prov">{t("provenance")}</Label>
          <Select id="r-prov" value={f.provenance} onChange={(ev) => set("provenance", ev.target.value as typeof f.provenance)}>{(["generated", "adapted", "verified"] as const).map((x) => <option key={x} value={x}>{p(`${x}.label`)}</option>)}</Select>
          <FieldHint>{p(`${f.provenance}.description`)}</FieldHint>
        </div>
        <div><Label htmlFor="r-status">{t("status")}</Label><Select id="r-status" value={f.status} onChange={(ev) => set("status", ev.target.value as typeof f.status)}>{(["draft", "published", "archived"] as const).map((x) => <option key={x} value={x}>{t(`statuses.${x}`)}</option>)}</Select></div>
      </div>
      <div><Label htmlFor="r-source">{t("sourceNote")}</Label><Input id="r-source" value={f.sourceNote} onChange={(ev) => set("sourceNote", ev.target.value)} /><FieldHint>{t("sourceNoteHint")}</FieldHint></div>
      <Button type="submit" disabled={pending}>{pending ? <Spinner /> : null}{c("save")}</Button>
    </form>
  );
}
