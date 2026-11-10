"use client";

import { AlertTriangle, ChefHat, FileText, FlaskConical, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProvenanceBadge } from "@/components/recipes/provenance-badge";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/states";
import type { ChefPayload } from "@/lib/ai/schema";
import type { MeasurementSystem, TemperatureUnit } from "@/lib/domain/types";
import { ChefRecipeCard, type DeviceLabels } from "./chef-recipe-card";

export function UserBubble({ text }: { text: string }) {
  return <div className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-[15px] text-surface">{text}</div>;
}

export function AssistantAvatar() {
  return <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><ChefHat className="size-4" /></span>;
}

export function AssistantMessage({
  text,
  payload,
  conversationId,
  messageId,
  system,
  unit,
  devices,
  onAsk,
  streaming = false,
}: {
  text: string;
  payload: ChefPayload | null;
  conversationId: string | null;
  messageId: string | null;
  system: MeasurementSystem;
  unit: TemperatureUnit;
  devices: DeviceLabels;
  onAsk?: (question: string) => void;
  streaming?: boolean;
}) {
  const t = useTranslations("chef");
  return (
    <div className="flex gap-3" data-testid="assistant-message">
      <AssistantAvatar />
      <div className="min-w-0 flex-1">
        {payload ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {payload.provenance !== "none" ? <ProvenanceBadge provenance={payload.provenance} /> : null}
            {payload.demoAnswer ? <Badge variant="amber"><FlaskConical />{t("demoAnswer")}</Badge> : null}
          </div>
        ) : null}
        <div className="space-y-3 text-[15px] leading-relaxed">
          {text.split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-wrap">{p}</p>)}
          {streaming ? <span className="inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary align-middle" aria-hidden /> : null}
        </div>

        {payload?.needsClarification && payload.clarifyingQuestions.length > 0 ? (
          <ul className="mt-3 space-y-1.5 rounded-lg border border-border bg-surface p-3 text-sm">
            {payload.clarifyingQuestions.map((q) => <li key={q} className="flex gap-2"><Info className="mt-0.5 size-4 shrink-0 text-primary" />{q}</li>)}
          </ul>
        ) : null}

        {payload?.knowledgeGap ? <Notice tone="warning" icon={Info} className="mt-3"><span className="font-medium">{t("knowledgeGap")} </span>{payload.knowledgeGap}</Notice> : null}

        {payload && payload.warnings.length > 0 ? (
          <Notice tone="warning" icon={AlertTriangle} className="mt-3">
            <p className="font-medium">{t("warnings.title")}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {payload.warnings.map((w, i) => <li key={i}>{t(`warnings.${w.code}`, { detail: w.detail })}</li>)}
            </ul>
          </Notice>
        ) : null}

        {payload?.recipe ? <ChefRecipeCard recipe={payload.recipe} conversationId={conversationId} messageId={messageId} system={system} unit={unit} devices={devices} /> : null}

        {payload && payload.sources.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
            <span className="inline-flex items-center gap-1"><FileText className="size-3.5" />{t("sources")}</span>
            {payload.sources.map((s) =>
              s.url ? <a key={s.title} href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="underline-offset-2 hover:underline">{s.title}</a> : <span key={s.title}>{s.title}</span>,
            )}
          </div>
        ) : null}

        {payload && onAsk && payload.followUps.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {payload.followUps.map((q) => (
              <button key={q} type="button" onClick={() => onAsk(q)} className="cursor-pointer rounded-full border border-border-strong bg-surface px-3.5 py-1.5 text-left text-sm hover:bg-sunken">{q}</button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
