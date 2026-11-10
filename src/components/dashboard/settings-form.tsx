"use client";

import { Download, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteAccountAction, updateSettingsAction } from "@/actions/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { useRouter } from "@/lib/i18n/navigation";
import { Segmented, TasteFields, UnitFields, type PreferencesState } from "./preferences-fields";

export function SettingsForm({ initial, email, isDemo }: { initial: PreferencesState; email: string; isDemo: boolean }) {
  const t = useTranslations("settings");
  const c = useTranslations("common");
  const e = useTranslations("errors");
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [confirmation, setConfirmation] = useState("");
  const [pending, start] = useTransition();
  const set = (patch: Partial<PreferencesState>) => setState((prev) => ({ ...prev, ...patch }));
  const word = t("delete.word");

  const save = () =>
    start(async () => {
      const result = await updateSettingsAction(state);
      if (!result.ok) return void toast.error(e(result.error));
      toast.success(c("saved"));
      router.replace("/dashboard/settings", { locale: state.locale });
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      const result = await deleteAccountAction(confirmation);
      if (!result.ok) return void toast.error(e(result.error));
      router.replace("/", { locale: state.locale });
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{t("profile")}</CardTitle><CardDescription>{isDemo ? t("demoProfile") : email}</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className="max-w-sm">
            <Label htmlFor="displayName">{t("displayName")}</Label>
            <Input id="displayName" value={state.displayName} maxLength={60} onChange={(ev) => set({ displayName: ev.target.value })} placeholder={t("displayNamePlaceholder")} />
          </div>
          <div>
            <Label>{t("language")}</Label>
            <Segmented value={state.locale} onChange={(v) => set({ locale: v })} label={t("language")} options={[{ value: "en", label: "English" }, { value: "fr", label: "Français" }]} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("units")}</CardTitle><CardDescription>{t("unitsHint")}</CardDescription></CardHeader>
        <CardContent><UnitFields state={state} set={set} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("tastes")}</CardTitle><CardDescription>{t("tastesHint")}</CardDescription></CardHeader>
        <CardContent><TasteFields state={state} set={set} /></CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 flex justify-end lg:bottom-4">
        <Button size="lg" onClick={save} disabled={pending} className="shadow-card" data-testid="save-settings">{pending ? <Spinner /> : null}{c("save")}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("data.title")}</CardTitle><CardDescription>{t("data.description")}</CardDescription></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="secondary"><a href="/api/account/export" download><Download />{t("data.export")}</a></Button>
          <Dialog>
            <DialogTrigger asChild><Button variant="ghost" className="text-destructive hover:bg-terracotta-soft"><Trash2 />{t("delete.cta")}</Button></DialogTrigger>
            <DialogContent closeLabel={c("close")}>
              <DialogTitle>{t("delete.title")}</DialogTitle>
              <DialogDescription>{t("delete.description")}</DialogDescription>
              <div className="mt-5">
                <Label htmlFor="confirm-delete">{t("delete.confirmLabel", { word })}</Label>
                <Input id="confirm-delete" value={confirmation} onChange={(ev) => setConfirmation(ev.target.value)} autoComplete="off" />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <DialogClose asChild><Button variant="secondary">{c("cancel")}</Button></DialogClose>
                <Button variant="destructive" onClick={remove} disabled={pending || confirmation.trim().toUpperCase() !== word}>{pending ? <Spinner /> : null}{t("delete.confirm")}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
