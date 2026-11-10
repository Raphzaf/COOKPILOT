import { BadgeCheck, ChefHat, Clock, Gauge, ShieldAlert, Thermometer, Timer, Users, Wrench } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/states";
import type { DeviceModel, Locale, MeasurementSystem, Recipe, TemperatureUnit, UserDevice } from "@/lib/domain/types";
import { bestDeviceForRecipe } from "@/lib/recipes/compatibility";
import { programLabel } from "@/lib/seo";
import { formatDuration, formatTemperature } from "@/lib/units";
import { IngredientsPanel } from "./ingredients-panel";
import { DemoBadge, ProvenanceBadge, ProvenanceNote } from "./provenance-badge";
import { RecipeCover } from "./recipe-card";

export async function RecipeView({
  recipe,
  system,
  unit,
  models,
  userDevices,
  actions,
  children,
}: {
  recipe: Recipe;
  system: MeasurementSystem;
  unit: TemperatureUnit;
  /** Catalogue models referenced by the recipe's compatibility list. */
  models: DeviceModel[];
  /** Signed-in user's appliances, or null on public pages. */
  userDevices: UserDevice[] | null;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const t = await getTranslations("recipes");
  const locale = (await getLocale()) as Locale;
  const compatible = recipe.compatibility
    .map((c) => ({ entry: c, model: models.find((m) => m.id === c.deviceModelId) }))
    .filter((c): c is { entry: Recipe["compatibility"][number]; model: DeviceModel } => Boolean(c.model));
  const best = userDevices ? bestDeviceForRecipe(recipe, userDevices) : null;
  const nameOf = (key: string) => {
    const cap = (best?.device.model ?? compatible[0]?.model)?.capabilities.find((c) => c.key === key);
    return cap?.name[locale] ?? programLabel(key);
  };
  const longFreeze = recipe.steps.some((s) => (s.durationSeconds ?? 0) >= 6 * 3600);

  return (
    <article>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-sunken">
          <RecipeCover recipe={recipe} sizes="(min-width: 1024px) 50vw, 100vw" priority />
        </div>
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <ProvenanceBadge provenance={recipe.provenance} />
            {recipe.isDemo ? <DemoBadge /> : null}
            <Badge variant="outline">{t(`deviceCategories.${recipe.deviceCategory}`)}</Badge>
          </div>
          <h1 className="text-4xl leading-tight md:text-5xl">{recipe.title}</h1>
          <p className="mt-4 text-lg text-muted">{recipe.description}</p>
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div className="flex items-center gap-2"><Clock className="size-4 text-primary" /><dt className="text-muted">{t("prep")}</dt><dd className="font-medium">{t("minutes", { count: recipe.prepMinutes })}</dd></div>
            <div className="flex items-center gap-2"><Timer className="size-4 text-primary" /><dt className="text-muted">{t("cook")}</dt><dd className="font-medium">{t("minutes", { count: recipe.cookMinutes })}</dd></div>
            <div className="flex items-center gap-2"><Users className="size-4 text-primary" /><dt className="sr-only">{t("serves")}</dt><dd className="font-medium">{t("servings", { count: recipe.servings })}</dd></div>
            <div className="flex items-center gap-2"><Gauge className="size-4 text-primary" /><dt className="sr-only">{t("difficultyLabel")}</dt><dd className="font-medium">{t(`difficulty.${recipe.difficulty}`)}</dd></div>
          </dl>
          {longFreeze ? <p className="mt-3 text-sm text-muted">{t("freezeNote")}</p> : null}
          {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <ProvenanceNote provenance={recipe.provenance} />
          {recipe.sourceNote ? <p className="mt-1.5 text-sm text-muted">{recipe.sourceNote}</p> : null}
        </div>
        {best && best.result.level === "incompatible" ? <Notice tone="warning" icon={Wrench}>{t("compat.incompatible")}</Notice> : null}
        {best && best.result.level === "partial" ? (
          <Notice tone="warning" icon={Wrench}>
            {t("compat.partial", { device: `${best.device.model.brand.name} ${best.device.model.modelNumber}` })}
            {best.result.missingPrograms.length > 0 ? ` ${t("compat.missingPrograms", { programs: best.result.missingPrograms.map(programLabel).join(", ") })}` : ""}
            {best.result.temperatureOutOfRange ? ` ${t("compat.temperature")}` : ""}
          </Notice>
        ) : null}
        {best && (best.result.level === "compatible" || best.result.level === "tested") ? (
          <Notice icon={BadgeCheck}>
            {t(best.result.level === "tested" ? "compat.tested" : "compat.compatible", { device: `${best.device.model.brand.name} ${best.device.model.modelNumber}` })}
          </Notice>
        ) : null}
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_1.5fr]">
        <div className="space-y-10">
          <section aria-labelledby="ingredients-title">
            <h2 id="ingredients-title" className="mb-4 text-2xl">{t("ingredients")}</h2>
            <IngredientsPanel ingredients={recipe.ingredients} baseServings={recipe.servings} initialSystem={system} />
          </section>

          {recipe.accessories.length > 0 ? (
            <section>
              <h2 className="mb-3 text-xl">{t("accessories")}</h2>
              <ul className="list-disc space-y-1 pl-5 text-[15px] text-muted">{recipe.accessories.map((a) => <li key={a}>{a}</li>)}</ul>
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 text-xl">{t("compatibleModels")}</h2>
            {compatible.length === 0 ? (
              <p className="text-sm text-muted">{t("noCompatibleModels")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {compatible.map(({ entry, model }) => (
                  <li key={model.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                    <span>{model.brand.name} {model.name} <span className="text-muted">{model.modelNumber} · {model.region}</span></span>
                    <Badge variant={entry.tested ? "olive" : "neutral"}>{entry.tested ? t("testedOnModel") : t("notTestedOnModel")}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-subtle">{t("compatibilityHint")}</p>
          </section>
        </div>

        <div className="space-y-10">
          <section aria-labelledby="steps-title">
            <h2 id="steps-title" className="mb-4 text-2xl">{t("method")}</h2>
            <ol className="space-y-5">
              {recipe.steps.map((step) => (
                <li key={step.position} className="flex gap-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground font-serif text-sm text-surface">{step.position}</span>
                  <div className="min-w-0 pt-0.5">
                    <p className="leading-relaxed">{step.instruction}</p>
                    {step.program || step.temperatureC != null || step.durationSeconds ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {step.program ? <Badge variant="olive"><ChefHat />{nameOf(step.program)}{step.level ? ` · ${step.level}` : ""}</Badge> : null}
                        {step.temperatureC != null ? <Badge variant="amber"><Thermometer />{formatTemperature(step.temperatureC, unit)}</Badge> : null}
                        {step.durationSeconds ? <Badge variant="neutral"><Timer />{formatDuration(step.durationSeconds, locale)}</Badge> : null}
                      </div>
                    ) : null}
                    {step.tip ? <p className="mt-2 text-sm italic text-muted">{step.tip}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {recipe.safetyNotes.length > 0 ? (
            <section className="rounded-xl border border-terracotta/25 bg-terracotta-soft/50 p-5">
              <h2 className="mb-2 flex items-center gap-2 font-sans text-base font-semibold tracking-normal text-terracotta"><ShieldAlert className="size-4" />{t("safety")}</h2>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground/85">{recipe.safetyNotes.map((n) => <li key={n}>{n}</li>)}</ul>
            </section>
          ) : null}

          {children}
        </div>
      </div>
    </article>
  );
}
