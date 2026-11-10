"use client";

import { Minus, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale, MeasurementSystem, RecipeIngredient } from "@/lib/domain/types";
import { formatQuantity, scaleQuantity } from "@/lib/units";
import { cn } from "@/lib/utils";

export function IngredientList({
  ingredients,
  baseServings,
  servings,
  system,
  checkable = false,
  large = false,
}: {
  ingredients: RecipeIngredient[];
  baseServings: number;
  servings: number;
  system: MeasurementSystem;
  checkable?: boolean;
  large?: boolean;
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("recipes");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  return (
    <ul className={cn("divide-y divide-border", large ? "text-lg" : "text-[15px]")}>
      {ingredients.map((ingredient, index) => {
        const q = formatQuantity(scaleQuantity(ingredient.quantity, baseServings, servings), ingredient.unit, system, locale);
        const done = checked.has(index);
        const body = (
          <>
            <span className={cn("w-24 shrink-0 font-medium tabular-nums", done && "text-subtle line-through")}>{q ? `${q.amount}${q.unit ? ` ${q.unit}` : ""}` : "—"}</span>
            <span className={cn("min-w-0", done && "text-subtle line-through")}>
              {ingredient.name}
              {ingredient.note ? <span className="text-muted">, {ingredient.note}</span> : null}
              {ingredient.optional ? <span className="text-muted"> ({t("optional")})</span> : null}
            </span>
          </>
        );
        return (
          <li key={index}>
            {checkable ? (
              <label className={cn("flex cursor-pointer items-center gap-3", large ? "py-4" : "py-2.5")}>
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() =>
                    setChecked((prev) => {
                      const next = new Set(prev);
                      if (next.has(index)) next.delete(index);
                      else next.add(index);
                      return next;
                    })
                  }
                  className="size-6 shrink-0 accent-[#55622f]"
                />
                {body}
              </label>
            ) : (
              <div className="flex gap-3 py-2.5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function IngredientsPanel({
  ingredients,
  baseServings,
  initialServings,
  initialSystem,
}: {
  ingredients: RecipeIngredient[];
  baseServings: number;
  initialServings?: number;
  initialSystem: MeasurementSystem;
}) {
  const t = useTranslations("recipes");
  const [servings, setServings] = useState(initialServings ?? baseServings);
  const [system, setSystem] = useState<MeasurementSystem>(initialSystem);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2" role="group" aria-label={t("adjustServings")}>
          <Button variant="secondary" size="icon" className="size-9" onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label={t("fewerServings")} disabled={servings <= 1}>
            <Minus />
          </Button>
          <span className="min-w-24 text-center text-sm font-medium" aria-live="polite" data-testid="servings-value">{t("servings", { count: servings })}</span>
          <Button variant="secondary" size="icon" className="size-9" onClick={() => setServings((s) => Math.min(24, s + 1))} aria-label={t("moreServings")} disabled={servings >= 24}>
            <Plus />
          </Button>
        </div>
        <div className="inline-flex rounded-full border border-border-strong p-0.5 text-xs" role="group" aria-label={t("units")}>
          {(["metric", "imperial"] as const).map((s) => (
            <button key={s} type="button" aria-pressed={system === s} onClick={() => setSystem(s)} className={cn("cursor-pointer rounded-full px-3 py-1", system === s ? "bg-foreground text-surface" : "text-muted")}>
              {t(`system.${s}`)}
            </button>
          ))}
        </div>
      </div>
      <IngredientList ingredients={ingredients} baseServings={baseServings} servings={servings} system={system} />
    </div>
  );
}
