import "server-only";
import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Server-side product analytics (PostHog). Fire-and-forget; never blocks or fails a request.
 * Only coarse product events are sent — never message contents, ingredients or health data.
 */
export function track(event: string, distinctId: string, properties: Record<string, string | number | boolean | null> = {}): void {
  const key = serverEnv.posthogKey;
  if (!key || distinctId.startsWith("demo-")) return;
  void fetch(`${publicEnv.posthogHost}/capture/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ api_key: key, event, distinct_id: distinctId, properties: { ...properties, $lib: "cookpilot-server" } }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => undefined);
}
