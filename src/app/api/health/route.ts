import { getIntegrationStatus, isDemoMode } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Liveness + configuration status. Booleans only — never exposes values. */
export async function GET() {
  return Response.json({ status: "ok", mode: isDemoMode() ? "demo" : "live", integrations: getIntegrationStatus() }, { headers: { "cache-control": "no-store" } });
}
