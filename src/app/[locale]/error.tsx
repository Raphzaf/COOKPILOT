"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
  }, [error]);
  return (
    <main className="container-page flex min-h-[70dvh] items-center justify-center py-16">
      <div className="w-full max-w-lg">
        <ErrorState
          title={t("genericTitle")}
          description={error.digest ? t("genericBodyRef", { ref: error.digest }) : t("genericBody")}
          action={<Button onClick={reset}>{t("retry")}</Button>}
        />
      </div>
    </main>
  );
}
