import { getSessionUser } from "@/lib/auth/session";
import { getStore } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Personal data export (GDPR access / portability). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const store = await getStore();
  const data = await store.exportUserData(user.id, user.profile.locale);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="cookpilot-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
