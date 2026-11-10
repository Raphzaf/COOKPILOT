import { AlertCircle, BadgeCheck, CircleDashed, FileText, Flame, IceCreamBowl, Wind, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { DeviceModel, Locale, TemperatureUnit, VerificationStatus } from "@/lib/domain/types";
import { formatTemperatureRange } from "@/lib/units";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, LucideIcon> = { "indoor-grill": Flame, "air-fryer": Wind, "frozen-dessert-maker": IceCreamBowl };

export function DeviceIcon({ category, className }: { category: string; className?: string }) {
  const Icon = CATEGORY_ICONS[category] ?? CircleDashed;
  return (
    <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground", className)}>
      <Icon className="size-6" aria-hidden />
    </span>
  );
}

const STATUS = {
  verified: { icon: BadgeCheck, variant: "olive" },
  documented: { icon: FileText, variant: "olive" },
  partial: { icon: CircleDashed, variant: "amber" },
  incomplete: { icon: AlertCircle, variant: "terracotta" },
} as const;

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const t = useTranslations("verification");
  const { icon: Icon, variant } = STATUS[status];
  return (
    <Badge variant={variant} title={t(`${status}.description`)}>
      <Icon />
      {t(`${status}.label`)}
    </Badge>
  );
}

export function DeviceSummary({ model, children }: { model: DeviceModel; children?: React.ReactNode }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("devices");
  const programs = model.capabilities.filter((c) => c.kind === "program");
  return (
    <div className="flex gap-4">
      <DeviceIcon category={model.category.slug} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{model.brand.name} · {model.category.name[locale]} · {model.region}</p>
        <h3 className="mt-0.5 font-sans text-base font-semibold leading-snug tracking-normal">{model.name} <span className="font-normal text-muted">{model.modelNumber}</span></h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <VerificationBadge status={model.verificationStatus} />
          <span className="text-xs text-muted">{programs.length > 0 ? t("programCount", { count: programs.length }) : t("noPrograms")}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DeviceSheet({ model, unit }: { model: DeviceModel; unit: TemperatureUnit }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("devices");
  const v = useTranslations("verification");
  const programs = model.capabilities.filter((c) => c.kind === "program");
  const extras = model.capabilities.filter((c) => c.kind !== "program");
  const date = model.lastVerifiedAt ? new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { dateStyle: "long" }).format(new Date(model.lastVerifiedAt)) : null;
  return (
    <div className="space-y-8">
      <p className="text-muted">{model.description[locale]}</p>

      <section>
        <h2 className="mb-3 text-xl">{t("programs")}</h2>
        {programs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-strong p-4 text-sm text-muted">{t("noProgramsLong")}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {programs.map((p) => {
              const range = formatTemperatureRange(p.tempMin, p.tempMax, p.tempUnit, unit);
              return (
                <li key={p.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{p.name[locale]}</p>
                    {p.notes ? <p className="text-xs text-muted">{p.notes[locale]}</p> : null}
                  </div>
                  <p className="shrink-0 text-sm tabular-nums text-muted">
                    {range ?? (p.levels.length > 0 ? p.levels.join(" · ") : <span className="italic">{t("rangeNotDocumented")}</span>)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {extras.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xl">{t("accessoriesFeatures")}</h2>
          <ul className="space-y-2 text-sm">
            {extras.map((e) => (
              <li key={e.id}><span className="font-medium">{e.name[locale]}</span>{e.notes ? <span className="text-muted"> — {e.notes[locale]}</span> : null}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {model.specs.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xl">{t("specifications")}</h2>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {model.specs.map((s) => (
              <div key={s.key} className="flex justify-between gap-4 border-b border-border py-2">
                <dt className="text-muted">{s.label[locale]}</dt>
                <dd className="text-right font-medium">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {model.missingInfo.length > 0 ? (
        <section className="rounded-xl border border-[#ecdcae] bg-amber-soft/60 p-5">
          <h2 className="mb-2 font-sans text-base font-semibold tracking-normal text-amber-foreground">{t("missingTitle")}</h2>
          <p className="mb-3 text-sm text-amber-foreground/90">{t("missingIntro")}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-foreground">
            {model.missingInfo.map((m, i) => <li key={i}>{m[locale]}</li>)}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-xl">{t("sources")}</h2>
        <p className="mb-3 text-sm text-muted">
          {v(`${model.verificationStatus}.description`)} {date ? t("lastChecked", { date }) : null}
        </p>
        <ul className="space-y-1.5 text-sm">
          {model.sources.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline-offset-4 hover:underline">{s.title}</a>
              <span className="text-subtle"> · {t(`sourceKinds.${s.kind}`)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
