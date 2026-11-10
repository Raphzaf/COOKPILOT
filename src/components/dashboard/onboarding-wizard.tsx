"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { completeOnboardingAction } from "@/actions/user";
import { DevicePicker } from "@/components/devices/device-picker";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Progress, Spinner } from "@/components/ui/states";
import type { Brand, DeviceCategory, DeviceModel } from "@/lib/domain/types";
import { useRouter } from "@/lib/i18n/navigation";
import { Segmented, TasteFields, UnitFields, type PreferencesState } from "./preferences-fields";

const STEPS = ["language", "units", "appliances", "tastes", "done"] as const;

export function OnboardingWizard({
  initial,
  models,
  brands,
  categories,
  ownedModelIds,
  maxDevices,
}: {
  initial: PreferencesState;
  models: DeviceModel[];
  brands: Brand[];
  categories: DeviceCategory[];
  ownedModelIds: string[];
  maxDevices: number | null;
}) {
  const t = useTranslations("onboarding");
  const s = useTranslations("settings");
  const e = useTranslations("errors");
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [state, setState] = useState(initial);
  const [owned, setOwned] = useState(ownedModelIds);
  const [pending, start] = useTransition();
  const set = (patch: Partial<PreferencesState>) => setState((prev) => ({ ...prev, ...patch }));
  const step = STEPS[index]!;

  const changeLanguage = (locale: "en" | "fr") => {
    set({ locale });
    // Re-render the wizard in the chosen language straight away.
    router.replace("/onboarding", { locale });
  };

  const finish = () =>
    start(async () => {
      const result = await completeOnboardingAction(state);
      if (!result.ok) return void toast.error(e(result.error));
      router.replace("/dashboard", { locale: state.locale });
      router.refresh();
    });

  return (
    <main className="container-page flex min-h-[calc(100dvh-2rem)] max-w-2xl flex-col py-8">
      <div className="mb-8 flex items-center justify-between">
        <Logo />
        <p className="text-sm text-muted" data-testid="onboarding-step">{t("stepOf", { current: index + 1, total: STEPS.length })}</p>
      </div>
      <Progress value={((index + 1) / STEPS.length) * 100} label={t("progress")} />

      <div className="flex-1 py-10">
        <h1 className="text-4xl">{t(`${step}.title`)}</h1>
        <p className="mt-3 text-muted">{t(`${step}.subtitle`)}</p>
        <div className="mt-8">
          {step === "language" ? (
            <div className="space-y-6">
              <Segmented value={state.locale} onChange={changeLanguage} label={s("language")} options={[{ value: "en", label: "English" }, { value: "fr", label: "Français" }]} />
              <div className="max-w-sm">
                <Label htmlFor="name">{s("displayName")}</Label>
                <Input id="name" value={state.displayName} maxLength={60} onChange={(ev) => set({ displayName: ev.target.value })} placeholder={s("displayNamePlaceholder")} autoComplete="given-name" />
              </div>
            </div>
          ) : null}
          {step === "units" ? <UnitFields state={state} set={set} /> : null}
          {step === "appliances" ? <DevicePicker models={models} brands={brands} categories={categories} ownedModelIds={owned} maxDevices={maxDevices} onChange={setOwned} showSpecs={false} /> : null}
          {step === "tastes" ? <TasteFields state={state} set={set} /> : null}
          {step === "done" ? (
            <ul className="space-y-3 text-[15px]">
              {[t("done.summaryLanguage", { language: state.locale === "fr" ? "Français" : "English" }), t("done.summaryUnits", { system: s(state.measurementSystem), unit: `°${state.temperatureUnit}` }), t("done.summaryAppliances", { count: owned.length })].map((line) => (
                <li key={line} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"><Check className="size-4 text-primary" />{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="sticky bottom-0 -mx-5 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-5 py-4 backdrop-blur md:-mx-8 md:px-8">
        <Button variant="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0 || pending}><ArrowLeft />{t("back")}</Button>
        {step === "done" ? (
          <Button size="lg" onClick={finish} disabled={pending} data-testid="onboarding-finish">{pending ? <Spinner /> : null}{t("finish")}<ArrowRight /></Button>
        ) : (
          <Button size="lg" onClick={() => setIndex((i) => i + 1)} data-testid="onboarding-next">
            {step === "appliances" && owned.length === 0 ? t("skipForNow") : step === "tastes" ? t("continueOptional") : t("next")}
            <ArrowRight />
          </Button>
        )}
      </div>
    </main>
  );
}
