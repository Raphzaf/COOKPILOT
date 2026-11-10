import { getTranslations } from "next-intl/server";
import { DeleteKnowledgeButton, KnowledgeForm } from "@/components/admin/admin-actions";
import { VerificationBadge } from "@/components/devices/device-bits";
import { Badge } from "@/components/ui/badge";
import { Notice, PageHeader } from "@/components/ui/states";
import { adminPage } from "@/lib/admin-page";
import { getIntegrationStatus } from "@/lib/env";

export default async function AdminKnowledge({ params }: { params: Promise<{ locale: string }> }) {
  const { store } = await adminPage(params);
  const t = await getTranslations("admin.knowledge");
  const documents = await store.listKnowledgeDocuments();
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      {!getIntegrationStatus().gemini ? <Notice tone="warning" className="mb-6">{t("noEmbeddings")}</Notice> : null}
      <h2 className="mb-3 text-2xl">{t("add")}</h2>
      <KnowledgeForm />
      <h2 className="mb-3 mt-12 text-2xl">{t("documents", { count: documents.length })}</h2>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[44rem] text-sm" data-testid="knowledge-table">
          <thead><tr className="border-b border-border text-left text-xs text-muted"><th className="px-4 py-3 font-medium">{t("docTitle")}</th><th className="px-4 py-3 font-medium">{t("docType")}</th><th className="px-4 py-3 font-medium">{t("modelNumber")}</th><th className="px-4 py-3 font-medium">{t("chunks")}</th><th className="px-4 py-3 font-medium">{t("verification")}</th><th /></tr></thead>
          <tbody className="divide-y divide-border">
            {documents.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3"><span className="font-medium">{d.title}</span> <Badge variant="outline" className="ml-1 uppercase">{d.language}</Badge><br /><span className="text-xs text-muted">{d.source} — {d.rightsNote}</span></td>
                <td className="px-4 py-3 text-muted">{t(`types.${d.docType}`)}</td>
                <td className="px-4 py-3 text-muted">{d.modelNumber ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums">{d.chunkCount}</td>
                <td className="px-4 py-3"><VerificationBadge status={d.verificationStatus} /></td>
                <td className="px-2 py-3 text-right"><DeleteKnowledgeButton id={d.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
