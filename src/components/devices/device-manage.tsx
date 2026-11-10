"use client";

import { Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { removeDeviceAction, updateDeviceAction } from "@/actions/user";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { useRouter } from "@/lib/i18n/navigation";

export function DeviceManage({ id, nickname, isFavorite, label }: { id: string; nickname: string | null; isFavorite: boolean; label: string }) {
  const t = useTranslations("devices");
  const c = useTranslations("common");
  const e = useTranslations("errors");
  const router = useRouter();
  const [name, setName] = useState(nickname ?? "");
  const [pending, start] = useTransition();

  const save = (patch: { nickname?: string | null; isFavorite?: boolean }) =>
    start(async () => {
      const result = await updateDeviceAction(id, patch);
      if (!result.ok) return void toast.error(e(result.error));
      toast.success(c("saved"));
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      const result = await removeDeviceAction(id);
      if (!result.ok) return void toast.error(e(result.error));
      toast.success(t("removed"));
      router.replace("/dashboard/devices");
      router.refresh();
    });

  return (
    <div className="space-y-5 rounded-xl border border-border bg-surface p-5">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          save({ nickname: name.trim() || null });
        }}
      >
        <div className="flex-1">
          <Label htmlFor="nickname">{t("nickname")}</Label>
          <Input id="nickname" value={name} maxLength={60} onChange={(ev) => setName(ev.target.value)} placeholder={t("nicknamePlaceholder")} />
        </div>
        <Button type="submit" variant="secondary" disabled={pending}>{c("save")}</Button>
      </form>
      <div className="flex flex-wrap gap-3">
        <Button variant={isFavorite ? "soft" : "secondary"} onClick={() => save({ isFavorite: !isFavorite })} disabled={pending} aria-pressed={isFavorite}>
          <Star className={isFavorite ? "fill-current" : ""} />
          {isFavorite ? t("favoriteOn") : t("favoriteOff")}
        </Button>
        <Dialog>
          <DialogTrigger asChild><Button variant="ghost" className="text-destructive hover:bg-terracotta-soft" data-testid="remove-device"><Trash2 />{t("remove")}</Button></DialogTrigger>
          <DialogContent closeLabel={c("close")}>
            <DialogTitle>{t("removeTitle", { model: label })}</DialogTitle>
            <DialogDescription>{t("removeBody")}</DialogDescription>
            <div className="mt-6 flex justify-end gap-3">
              <DialogClose asChild><Button variant="secondary">{c("cancel")}</Button></DialogClose>
              <Button variant="destructive" onClick={remove} disabled={pending} data-testid="confirm-remove-device">{pending ? <Spinner /> : null}{t("remove")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
