"use client";

import { useTranslations } from "next-intl";
import { FieldHint, Input, Label, Select } from "@/components/ui/input";
import type { PreferencesInput } from "@/actions/user";
import { DIETS } from "@/lib/recipes/filter";
import { cn } from "@/lib/utils";

export type PreferencesState = Required<Pick<PreferencesInput, "locale" | "measurementSystem" | "temperatureUnit" | "servings">> & {
  displayName: string;
  cuisines: string;
  allergies: string;
  diets: string[];
  dislikes: string;
  experience: "beginner" | "intermediate" | "advanced" | null;
};

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="inline-flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors", value === o.value ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface hover:bg-sunken")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function UnitFields({ state, set }: { state: PreferencesState; set: (patch: Partial<PreferencesState>) => void }) {
  const t = useTranslations("settings");
  return (
    <div className="space-y-6">
      <div>
        <Label>{t("measurement")}</Label>
        <Segmented value={state.measurementSystem} onChange={(v) => set({ measurementSystem: v })} label={t("measurement")} options={[{ value: "metric", label: t("metric") }, { value: "imperial", label: t("imperial") }]} />
      </div>
      <div>
        <Label>{t("temperature")}</Label>
        <Segmented value={state.temperatureUnit} onChange={(v) => set({ temperatureUnit: v })} label={t("temperature")} options={[{ value: "C", label: t("celsius") }, { value: "F", label: t("fahrenheit") }]} />
      </div>
    </div>
  );
}

export function TasteFields({ state, set }: { state: PreferencesState; set: (patch: Partial<PreferencesState>) => void }) {
  const t = useTranslations("settings");
  const r = useTranslations("recipes");
  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="servings">{t("servings")}</Label>
          <Select id="servings" value={String(state.servings)} onChange={(ev) => set({ servings: Number(ev.target.value) })}>
            {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="experience">{t("experience")}</Label>
          <Select id="experience" value={state.experience ?? ""} onChange={(ev) => set({ experience: (ev.target.value || null) as PreferencesState["experience"] })}>
            <option value="">{t("notSpecified")}</option>
            <option value="beginner">{t("experienceLevels.beginner")}</option>
            <option value="intermediate">{t("experienceLevels.intermediate")}</option>
            <option value="advanced">{t("experienceLevels.advanced")}</option>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="cuisines">{t("cuisines")}</Label>
        <Input id="cuisines" value={state.cuisines} maxLength={400} onChange={(ev) => set({ cuisines: ev.target.value })} placeholder={t("cuisinesPlaceholder")} />
      </div>
      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium">{t("diets")}</legend>
        <div className="flex flex-wrap gap-2">
          {DIETS.map((d) => {
            const on = state.diets.includes(d);
            return (
              <button key={d} type="button" aria-pressed={on} onClick={() => set({ diets: on ? state.diets.filter((x) => x !== d) : [...state.diets, d] })} className={cn("cursor-pointer rounded-full border px-3.5 py-1.5 text-sm", on ? "border-primary bg-accent text-accent-foreground" : "border-border-strong bg-surface hover:bg-sunken")}>
                {r(`diets.${d}`)}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div>
        <Label htmlFor="allergies">{t("allergies")}</Label>
        <Input id="allergies" value={state.allergies} maxLength={400} onChange={(ev) => set({ allergies: ev.target.value })} placeholder={t("allergiesPlaceholder")} />
        <FieldHint>{t("allergiesHint")}</FieldHint>
      </div>
      <div>
        <Label htmlFor="dislikes">{t("dislikes")}</Label>
        <Input id="dislikes" value={state.dislikes} maxLength={400} onChange={(ev) => set({ dislikes: ev.target.value })} placeholder={t("dislikesPlaceholder")} />
      </div>
    </div>
  );
}
