"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteKnowledgeAction, ingestKnowledgeAction, setRecipeStatusAction, setUserRoleAction, updateSupportRequestAction } from "@/actions/admin";
import type { ActionResult } from "@/actions/helpers";
import { Button } from "@/components/ui/button";
import { FieldHint, Input, Label, Select, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { useRouter } from "@/lib/i18n/navigation";

function useAdminAction() {
  const e = useTranslations("errors");
  const c = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult<unknown>>, message?: string) =>
    start(async () => {
      const result = await fn();
      if (!result.ok) return void toast.error(e(result.error));
      toast.success(message ?? c("saved"));
      router.refresh();
    });
  return { pending, run };
}

export function RecipeStatusSelect({ id, status }: { id: string; status: string }) {
  const t = useTranslations("admin.recipes");
  const { pending, run } = useAdminAction();
  return (
    <Select className="h-9 w-36 text-sm" value={status} disabled={pending} aria-label={t("status")} onChange={(ev) => run(() => setRecipeStatusAction(id, ev.target.value))} data-testid={`recipe-status-${id}`}>
      {(["draft", "published", "archived"] as const).map((x) => <option key={x} value={x}>{t(`statuses.${x}`)}</option>)}
    </Select>
  );
}

export function RequestStatusSelect({ id, status }: { id: string; status: string }) {
  const t = useTranslations("admin.feedback");
  const { pending, run } = useAdminAction();
  return (
    <Select className="h-9 w-36 text-sm" value={status} disabled={pending} aria-label={t("status")} onChange={(ev) => run(() => updateSupportRequestAction(id, ev.target.value))}>
      {(["open", "in_review", "resolved"] as const).map((x) => <option key={x} value={x}>{t(`statuses.${x}`)}</option>)}
    </Select>
  );
}

export function UserRoleSelect({ userId, role, self }: { userId: string; role: string; self: boolean }) {
  const t = useTranslations("admin.users");
  const { pending, run } = useAdminAction();
  return (
    <Select className="h-9 w-28 text-sm" value={role} disabled={pending || self} aria-label={t("role")} title={self ? t("selfHint") : undefined} onChange={(ev) => run(() => setUserRoleAction(userId, ev.target.value))}>
      <option value="user">{t("roles.user")}</option>
      <option value="admin">{t("roles.admin")}</option>
    </Select>
  );
}

export function DeleteKnowledgeButton({ id }: { id: string }) {
  const c = useTranslations("common");
  const { pending, run } = useAdminAction();
  return <Button variant="ghost" size="icon" className="text-destructive" disabled={pending} aria-label={c("delete")} onClick={() => run(() => deleteKnowledgeAction(id))}><Trash2 /></Button>;
}

export function KnowledgeForm() {
  const t = useTranslations("admin.knowledge");
  const v = useTranslations("verification");
  const e = useTranslations("errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const empty = { title: "", source: "", sourceUrl: "", manufacturer: "", modelNumber: "", language: "en" as "en" | "fr", docType: "guide" as const, publishedAt: "", verificationStatus: "partial" as const, rightsNote: "", content: "" };
  const [f, setF] = useState<{ title: string; source: string; sourceUrl: string; manufacturer: string; modelNumber: string; language: "en" | "fr"; docType: "manual" | "specification" | "capability" | "recipe" | "food_safety" | "guide"; publishedAt: string; verificationStatus: "verified" | "documented" | "partial" | "incomplete"; rightsNote: string; content: string }>(empty);
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => setF((prev) => ({ ...prev, [key]: value }));
  return (
    <form
      className="space-y-4 rounded-xl border border-border bg-surface p-5 md:p-6"
      data-testid="knowledge-form"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await ingestKnowledgeAction(f);
          if (!result.ok) return void toast.error(result.error === "INVALID_INPUT" ? t("invalid") : e(result.error));
          toast.success(t(result.data.embedded ? "ingestedEmbedded" : "ingestedText", { count: result.data.chunks }));
          setF(empty);
          router.refresh();
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label htmlFor="k-title">{t("docTitle")}</Label><Input id="k-title" required value={f.title} onChange={(ev) => set("title", ev.target.value)} /></div>
        <div><Label htmlFor="k-source">{t("source")}</Label><Input id="k-source" required value={f.source} onChange={(ev) => set("source", ev.target.value)} placeholder={t("sourcePlaceholder")} /></div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2"><Label htmlFor="k-url">{t("sourceUrl")}</Label><Input id="k-url" type="url" value={f.sourceUrl} onChange={(ev) => set("sourceUrl", ev.target.value)} placeholder="https://" /></div>
        <div><Label htmlFor="k-brand">{t("manufacturer")}</Label><Input id="k-brand" value={f.manufacturer} onChange={(ev) => set("manufacturer", ev.target.value)} /></div>
        <div><Label htmlFor="k-model">{t("modelNumber")}</Label><Input id="k-model" value={f.modelNumber} onChange={(ev) => set("modelNumber", ev.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div><Label htmlFor="k-lang">{t("language")}</Label><Select id="k-lang" value={f.language} onChange={(ev) => set("language", ev.target.value as "en" | "fr")}><option value="en">English</option><option value="fr">Français</option></Select></div>
        <div><Label htmlFor="k-type">{t("docType")}</Label><Select id="k-type" value={f.docType} onChange={(ev) => set("docType", ev.target.value as typeof f.docType)}>{(["manual", "specification", "capability", "recipe", "food_safety", "guide"] as const).map((x) => <option key={x} value={x}>{t(`types.${x}`)}</option>)}</Select></div>
        <div><Label htmlFor="k-date">{t("publishedAt")}</Label><Input id="k-date" type="date" value={f.publishedAt} onChange={(ev) => set("publishedAt", ev.target.value)} /></div>
        <div><Label htmlFor="k-status">{t("verification")}</Label><Select id="k-status" value={f.verificationStatus} onChange={(ev) => set("verificationStatus", ev.target.value as typeof f.verificationStatus)}>{(["incomplete", "partial", "documented", "verified"] as const).map((x) => <option key={x} value={x}>{v(`${x}.label`)}</option>)}</Select></div>
      </div>
      <div><Label htmlFor="k-rights">{t("rights")}</Label><Input id="k-rights" required minLength={10} value={f.rightsNote} onChange={(ev) => set("rightsNote", ev.target.value)} placeholder={t("rightsPlaceholder")} /><FieldHint>{t("rightsHint")}</FieldHint></div>
      <div><Label htmlFor="k-content">{t("content")}</Label><Textarea id="k-content" required minLength={40} className="min-h-48" value={f.content} onChange={(ev) => set("content", ev.target.value)} /><FieldHint>{t("contentHint")}</FieldHint></div>
      <Button type="submit" disabled={pending}>{pending ? <Spinner /> : null}{t("ingest")}</Button>
    </form>
  );
}
