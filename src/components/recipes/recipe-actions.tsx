"use client";

import { Heart, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitRecipeFeedbackAction, toggleFavoriteAction } from "@/actions/user";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { cn } from "@/lib/utils";

export function FavoriteButton({ recipeId, initial, compact = false }: { recipeId: string; initial: boolean; compact?: boolean }) {
  const t = useTranslations("recipes");
  const e = useTranslations("errors");
  const [favorite, setFavorite] = useState(initial);
  const [pending, start] = useTransition();
  const toggle = () =>
    start(async () => {
      const next = !favorite;
      setFavorite(next);
      const result = await toggleFavoriteAction(recipeId, next);
      if (!result.ok) {
        setFavorite(!next);
        toast.error(e(result.error));
      } else toast.success(next ? t("savedToFavorites") : t("removedFromFavorites"));
    });
  return (
    <Button variant="secondary" size={compact ? "icon" : "md"} onClick={toggle} disabled={pending} aria-pressed={favorite} aria-label={favorite ? t("removeFavorite") : t("addFavorite")} data-testid="favorite-button">
      <Heart className={cn(favorite && "fill-terracotta text-terracotta")} />
      {compact ? null : favorite ? t("saved") : t("save")}
    </Button>
  );
}

export function StarRating({ value, onChange, size = "md" }: { value: number | null; onChange: (v: number) => void; size?: "md" | "lg" }) {
  const t = useTranslations("recipes");
  return (
    <div className="inline-flex gap-1" role="radiogroup" aria-label={t("rating")}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={t("stars", { count: n })} onClick={() => onChange(n)} className="cursor-pointer rounded-md p-1">
          <Star className={cn(size === "lg" ? "size-10" : "size-6", value != null && n <= value ? "fill-[#d9a520] text-[#d9a520]" : "text-border-strong")} />
        </button>
      ))}
    </div>
  );
}

export function FeedbackForm({ recipeId, deviceModelId }: { recipeId: string; deviceModelId: string | null }) {
  const t = useTranslations("recipes");
  const e = useTranslations("errors");
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  if (sent) return <p className="text-sm text-accent-foreground">{t("feedbackThanks")}</p>;
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await submitRecipeFeedbackAction({ recipeId, rating, comment: comment || null, deviceModelId });
          if (result.ok) setSent(true);
          else toast.error(e(result.error));
        });
      }}
    >
      <StarRating value={rating} onChange={setRating} />
      <Textarea value={comment} onChange={(ev) => setComment(ev.target.value)} placeholder={t("feedbackPlaceholder")} maxLength={2000} aria-label={t("feedbackLabel")} />
      <Button type="submit" variant="secondary" disabled={pending || (rating == null && !comment.trim())}>
        {pending ? <Spinner /> : null}
        {t("sendFeedback")}
      </Button>
    </form>
  );
}
