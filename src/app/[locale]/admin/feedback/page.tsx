import { Inbox, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { RequestStatusSelect } from "@/components/admin/admin-actions";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/states";
import { adminPage } from "@/lib/admin-page";
import { intlLocale } from "@/lib/i18n/locale";

export default async function AdminFeedback({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, store } = await adminPage(params);
  const t = await getTranslations("admin.feedback");
  const [requests, feedback] = await Promise.all([store.listSupportRequests(), store.listRecipeFeedback(100)]);
  const date = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium" });
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <h2 className="mb-3 text-2xl">{t("requests")}</h2>
      {requests.length === 0 ? <EmptyState icon={Inbox} title={t("noRequests")} /> : (
        <ul className="space-y-3" data-testid="support-requests">
          {requests.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2"><Badge variant={r.kind === "missing_device" ? "amber" : "neutral"}>{t(`kinds.${r.kind}`)}</Badge><span className="text-xs text-muted">{date.format(new Date(r.createdAt))}{r.email ? ` · ${r.email}` : ""}</span></div>
                <p className="font-medium">{r.subject}</p>
                {r.message !== r.subject ? <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{r.message}</p> : null}
              </div>
              <RequestStatusSelect id={r.id} status={r.status} />
            </li>
          ))}
        </ul>
      )}
      <h2 className="mb-3 mt-12 text-2xl">{t("recipeFeedback")}</h2>
      {feedback.length === 0 ? <EmptyState icon={Star} title={t("noFeedback")} /> : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {feedback.map((f) => (
            <li key={f.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{f.recipeTitle}</p><span className="inline-flex items-center gap-1 text-muted">{f.rating != null ? <><Star className="size-3.5 fill-[#d9a520] text-[#d9a520]" />{f.rating}/5 · </> : null}{date.format(new Date(f.createdAt))}</span></div>
              {f.comment ? <p className="mt-1 whitespace-pre-wrap text-muted">{f.comment}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
