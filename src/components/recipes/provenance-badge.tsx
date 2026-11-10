import { BadgeCheck, FlaskConical, Shuffle, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { Provenance } from "@/lib/domain/types";

const CONFIG = {
  verified: { icon: BadgeCheck, variant: "olive" },
  adapted: { icon: Shuffle, variant: "amber" },
  generated: { icon: Sparkles, variant: "neutral" },
} as const;

export function ProvenanceBadge({ provenance, className }: { provenance: Provenance; className?: string }) {
  const t = useTranslations("provenance");
  const { icon: Icon, variant } = CONFIG[provenance];
  return (
    <Badge variant={variant} className={className} title={t(`${provenance}.description`)} data-provenance={provenance}>
      <Icon />
      {t(`${provenance}.label`)}
    </Badge>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  const t = useTranslations("provenance");
  return (
    <Badge variant="outline" className={className} title={t("demo.description")}>
      <FlaskConical />
      {t("demo.label")}
    </Badge>
  );
}

export function ProvenanceNote({ provenance }: { provenance: Provenance }) {
  const t = useTranslations("provenance");
  return (
    <p className="text-sm text-muted">
      <span className="font-medium text-foreground">{t(`${provenance}.label`)} — </span>
      {t(`${provenance}.description`)}
    </p>
  );
}
