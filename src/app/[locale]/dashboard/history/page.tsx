import { ChefHat, History, MessageCircle, UtensilsCrossed } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { EmptyState, Notice, PageHeader } from "@/components/ui/states";
import { getEntitlements, historyCutoff } from "@/lib/billing/entitlements";
import { intlLocale } from "@/lib/i18n/locale";
import { Link } from "@/lib/i18n/navigation";
import { appPage } from "@/lib/page-context";

export default async function HistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, user, store } = await appPage(params);
  const t = await getTranslations("history");
  const { limits } = await getEntitlements(store, user.id);
  const cutoff = historyCutoff(limits);
  const [sessions, conversations] = await Promise.all([store.listCookingSessions(user.id, cutoff), store.listConversations(user.id, cutoff)]);
  const date = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeStyle: "short" });
  const nothing = sessions.length === 0 && conversations.length === 0;
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      {limits.historyDays != null ? (
        <Notice className="mb-6">
          {t("limited", { days: limits.historyDays })} <Link href="/dashboard/subscription" className="font-medium underline">{t("upgrade")}</Link>
        </Notice>
      ) : null}
      {nothing ? (
        <EmptyState icon={History} title={t("emptyTitle")} description={t("emptyBody")} action={<Button asChild><Link href="/dashboard/chef"><ChefHat />{t("askChef")}</Link></Button>} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <section aria-labelledby="cooked-title">
            <h2 id="cooked-title" className="mb-3 flex items-center gap-2 text-xl"><UtensilsCrossed className="size-5 text-primary" />{t("cooked")}</h2>
            {sessions.length === 0 ? <p className="text-sm text-muted">{t("noCooked")}</p> : (
              <ul className="divide-y divide-border rounded-xl border border-border bg-surface" data-testid="history-cooked">
                {sessions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    {s.recipeId ? <Link href={`/dashboard/recipes/${s.recipeId}`} className="truncate font-medium hover:underline">{s.recipeTitle}</Link> : <span className="truncate">{s.recipeTitle}</span>}
                    <span className="shrink-0 text-xs text-muted">{date.format(new Date(s.completedAt))}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="chats-title">
            <h2 id="chats-title" className="mb-3 flex items-center gap-2 text-xl"><MessageCircle className="size-5 text-primary" />{t("conversations")}</h2>
            {conversations.length === 0 ? <p className="text-sm text-muted">{t("noConversations")}</p> : (
              <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
                {conversations.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <Link href={`/dashboard/chef?c=${c.id}`} className="truncate font-medium hover:underline">{c.title}</Link>
                    <span className="shrink-0 text-xs text-muted">{date.format(new Date(c.updatedAt))}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
