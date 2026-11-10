"use client";

import { BookmarkPlus, ChefHat, Clock, Play, ShieldAlert, Thermometer, Timer, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveChefRecipeAction } from "@/actions/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/states";
import type { ChefRecipe } from "@/lib/ai/schema";
import type { Locale, MeasurementSystem, TemperatureUnit } from "@/lib/domain/types";
import { Link } from "@/lib/i18n/navigation";
import { convertTemperature, formatDuration, formatQuantity } from "@/lib/units";

export interface DeviceLabels {
  /** device model id → label and program key → localized name */
  [modelId: string]: { label: string; programs: Record<string, string> };
}

export function ChefRecipeCard({
  recipe,
  conversationId,
  messageId,
  system,
  unit,
  devices,
}: {
  recipe: ChefRecipe;
  conversationId: string | null;
  messageId: string | null;
  system: MeasurementSystem;
  unit: TemperatureUnit;
  devices: DeviceLabels;
}) {
  const t = useTranslations("chef");
  const r = useTranslations("recipes");
  const e = useTranslations("errors");
  const locale = useLocale() as Locale;
  const [savedId, setSavedId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const device = recipe.deviceModelId ? devices[recipe.deviceModelId] : undefined;

  const save = () =>
    start(async () => {
      if (!conversationId || !messageId) return;
      const result = await saveChefRecipeAction(conversationId, messageId);
      if (!result.ok) return void toast.error(e(result.error));
      setSavedId(result.data.id);
      toast.success(t("recipe.saved"));
    });

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface" data-testid="chef-recipe-card">
      <div className="border-b border-border bg-sunken/60 px-5 py-4">
        <h3 className="text-2xl leading-snug">{recipe.title}</h3>
        {recipe.description ? <p className="mt-1 text-sm text-muted">{recipe.description}</p> : null}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" />{r("minutes", { count: recipe.prepMinutes + recipe.cookMinutes })}</span>
          <span className="inline-flex items-center gap-1.5"><Users className="size-3.5" />{r("servings", { count: recipe.servings })}</span>
          <span>{r(`difficulty.${recipe.difficulty}`)}</span>
          {device ? <span className="inline-flex items-center gap-1.5 font-medium text-accent-foreground"><ChefHat className="size-3.5" />{device.label}</span> : null}
        </div>
      </div>
      <div className="grid gap-6 p-5 md:grid-cols-[1fr_1.4fr]">
        <div>
          <h4 className="mb-2 text-sm font-semibold">{r("ingredients")}</h4>
          <ul className="space-y-1.5 text-sm">
            {recipe.ingredients.map((i, index) => {
              const q = formatQuantity(i.quantity, i.unit, system, locale);
              return (
                <li key={index} className="flex gap-2">
                  <span className="w-20 shrink-0 font-medium tabular-nums">{q ? `${q.amount}${q.unit ? ` ${q.unit}` : ""}` : "—"}</span>
                  <span>{i.name}{i.note ? <span className="text-muted">, {i.note}</span> : null}</span>
                </li>
              );
            })}
          </ul>
          {recipe.accessories.length > 0 ? (
            <>
              <h4 className="mb-2 mt-5 text-sm font-semibold">{r("accessories")}</h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted">{recipe.accessories.map((a) => <li key={a}>{a}</li>)}</ul>
            </>
          ) : null}
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold">{r("method")}</h4>
          <ol className="space-y-3 text-sm">
            {recipe.steps.map((s, index) => (
              <li key={index} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs text-surface">{index + 1}</span>
                <div className="min-w-0">
                  <p className="leading-relaxed">{s.instruction}</p>
                  {s.program || s.temperature != null || s.durationMinutes ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {s.program ? <Badge variant="olive">{device?.programs[s.program] ?? s.program}{s.level ? ` · ${s.level}` : ""}</Badge> : null}
                      {s.temperature != null && s.temperatureUnit ? <Badge variant="amber"><Thermometer />{convertTemperature(s.temperature, s.temperatureUnit, unit)} °{unit}</Badge> : null}
                      {s.durationMinutes ? <Badge variant="neutral"><Timer />{formatDuration(s.durationMinutes * 60, locale)}</Badge> : null}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
      {recipe.safetyNotes.length > 0 ? (
        <div className="border-t border-border bg-terracotta-soft/40 px-5 py-4">
          <p className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-terracotta"><ShieldAlert className="size-4" />{r("safety")}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">{recipe.safetyNotes.map((n) => <li key={n}>{n}</li>)}</ul>
        </div>
      ) : null}
      {conversationId && messageId ? (
        <div className="flex flex-wrap gap-3 border-t border-border px-5 py-4">
          {savedId ? (
            <>
              <Button asChild><Link href={`/dashboard/cooking/${savedId}`}><Play />{r("startCooking")}</Link></Button>
              <Button asChild variant="secondary"><Link href={`/dashboard/recipes/${savedId}`}>{t("recipe.open")}</Link></Button>
            </>
          ) : (
            <Button onClick={save} disabled={pending} data-testid="save-chef-recipe">{pending ? <Spinner /> : <BookmarkPlus />}{t("recipe.save")}</Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
