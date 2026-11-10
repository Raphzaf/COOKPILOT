import { getTranslations } from "next-intl/server";
import { UserRoleSelect } from "@/components/admin/admin-actions";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/states";
import { adminPage } from "@/lib/admin-page";
import { intlLocale } from "@/lib/i18n/locale";

export default async function AdminUsers({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, user, store } = await adminPage(params);
  const t = await getTranslations("admin.users");
  const users = await store.listUsers();
  const date = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium" });
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[40rem] text-sm" data-testid="users-table">
          <thead><tr className="border-b border-border text-left text-xs text-muted"><th className="px-4 py-3 font-medium">{t("user")}</th><th className="px-4 py-3 font-medium">{t("plan")}</th><th className="px-4 py-3 font-medium">{t("devices")}</th><th className="px-4 py-3 font-medium">{t("joined")}</th><th className="px-4 py-3 font-medium">{t("role")}</th></tr></thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3"><span className="font-medium">{u.displayName ?? "—"}</span><br /><span className="text-xs text-muted">{u.email}</span></td>
                <td className="px-4 py-3"><Badge variant={u.plan === "pro" ? "olive" : "outline"}>{u.plan === "pro" ? "Pro" : "Free"}</Badge></td>
                <td className="px-4 py-3 tabular-nums">{u.deviceCount}</td>
                <td className="px-4 py-3 text-muted">{date.format(new Date(u.createdAt))}</td>
                <td className="px-4 py-3"><UserRoleSelect userId={u.id} role={u.role} self={u.id === user.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
