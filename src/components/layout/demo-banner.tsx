import { FlaskConical } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isDemoMode } from "@/lib/env";

/** Permanent, unmissable label whenever the app runs on demo data instead of a real database. */
export async function DemoBanner() {
  if (!isDemoMode()) return null;
  const t = await getTranslations("setup");
  return (
    <div className="border-b border-[#ecdcae] bg-amber-soft text-amber-foreground" data-testid="demo-banner">
      <div className="container-page flex items-center justify-center gap-2 py-1.5 text-center text-xs">
        <FlaskConical className="size-3.5 shrink-0" aria-hidden />
        <p>{t("demoBanner")}</p>
      </div>
    </div>
  );
}
