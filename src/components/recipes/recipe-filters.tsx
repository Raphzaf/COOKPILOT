import { Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import type { DeviceCategory, Difficulty, Locale, RecipeFilter } from "@/lib/domain/types";
import { Link } from "@/lib/i18n/navigation";
import { DIETS, RECIPE_CATEGORIES, TIME_OPTIONS } from "@/lib/recipes/filter";

export type RecipeSearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

/** Converts URL search params into a validated RecipeFilter (unknown values are ignored). */
export function parseRecipeFilter(params: RecipeSearchParams, categories: DeviceCategory[]): RecipeFilter {
  const time = Number(one(params.time));
  const difficulty = one(params.difficulty);
  const appliance = one(params.appliance);
  const category = one(params.category);
  const diet = one(params.diet);
  return {
    query: one(params.q)?.slice(0, 80),
    deviceCategory: appliance && categories.some((c) => c.slug === appliance) ? appliance : undefined,
    category: category && (RECIPE_CATEGORIES as readonly string[]).includes(category) ? category : undefined,
    difficulty: difficulty === "easy" || difficulty === "medium" || difficulty === "advanced" ? (difficulty as Difficulty) : undefined,
    maxTotalMinutes: (TIME_OPTIONS as readonly number[]).includes(time) ? time : undefined,
    diet: diet && (DIETS as readonly string[]).includes(diet) ? diet : undefined,
    ingredients: one(params.ingredients)?.slice(0, 120).split(",").map((s) => s.trim()).filter(Boolean).slice(0, 6),
  };
}

/** Server-rendered GET form: works without JavaScript and produces shareable, crawlable URLs. */
export async function RecipeFilters({ action, filter, categories }: { action: string; filter: RecipeFilter; categories: DeviceCategory[] }) {
  const t = await getTranslations("recipes");
  const locale = (await getLocale()) as Locale;
  const active = Object.values(filter).some((v) => (Array.isArray(v) ? v.length > 0 : v !== undefined));
  return (
    <form action={`/${locale}${action}`} method="get" className="rounded-xl border border-border bg-surface p-4" role="search" aria-label={t("filters.title")}>
      <div className="grid gap-3 md:grid-cols-[2fr_1.4fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input type="search" name="q" defaultValue={filter.query ?? ""} placeholder={t("filters.search")} aria-label={t("filters.search")} className="pl-10" />
        </div>
        <Input name="ingredients" defaultValue={filter.ingredients?.join(", ") ?? ""} placeholder={t("filters.ingredients")} aria-label={t("filters.ingredients")} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Select name="appliance" defaultValue={filter.deviceCategory ?? ""} aria-label={t("filters.appliance")}>
          <option value="">{t("filters.anyAppliance")}</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name[locale]}</option>)}
        </Select>
        <Select name="category" defaultValue={filter.category ?? ""} aria-label={t("filters.category")}>
          <option value="">{t("filters.anyCategory")}</option>
          {RECIPE_CATEGORIES.map((c) => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
        </Select>
        <Select name="time" defaultValue={filter.maxTotalMinutes ? String(filter.maxTotalMinutes) : ""} aria-label={t("filters.time")}>
          <option value="">{t("filters.anyTime")}</option>
          {TIME_OPTIONS.map((m) => <option key={m} value={m}>{t("filters.under", { count: m })}</option>)}
        </Select>
        <Select name="difficulty" defaultValue={filter.difficulty ?? ""} aria-label={t("filters.difficulty")}>
          <option value="">{t("filters.anyDifficulty")}</option>
          {(["easy", "medium", "advanced"] as const).map((d) => <option key={d} value={d}>{t(`difficulty.${d}`)}</option>)}
        </Select>
        <Select name="diet" defaultValue={filter.diet ?? ""} aria-label={t("filters.diet")} className="col-span-2 md:col-span-1">
          <option value="">{t("filters.anyDiet")}</option>
          {DIETS.map((d) => <option key={d} value={d}>{t(`diets.${d}`)}</option>)}
        </Select>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button type="submit" size="sm">{t("filters.apply")}</Button>
        {active ? <Link href={action} className="text-sm text-muted underline-offset-4 hover:underline">{t("filters.reset")}</Link> : null}
      </div>
    </form>
  );
}
