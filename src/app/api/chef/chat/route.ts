import { runChef, type ChefEvent } from "@/lib/ai/chef";
import { chatRequestSchema } from "@/lib/ai/schema";
import { track } from "@/lib/analytics/server";
import { getSessionUser, persistDemoState } from "@/lib/auth/session";
import { getStore } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

function json(status: number, code: string) {
  return Response.json({ error: code }, { status });
}

/** AI Chef endpoint. Server-side only: the browser never sees prompts, keys or raw model output. */
export async function POST(request: Request) {
  // CSRF: the session cookie is SameSite=Lax; additionally require a same-origin JSON request.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== (request.headers.get("x-forwarded-host") ?? request.headers.get("host"))) return json(403, "FORBIDDEN");
  if (!request.headers.get("content-type")?.includes("application/json")) return json(415, "INVALID_INPUT");

  const user = await getSessionUser();
  if (!user) return json(401, "UNAUTHENTICATED");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, "INVALID_INPUT");
  }
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) return json(400, "INVALID_INPUT");

  const store = await getStore();
  await persistDemoState(user.id);
  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController<Uint8Array>, event: ChefEvent) =>
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of runChef({
          user,
          store,
          locale: parsed.data.locale,
          message: parsed.data.message,
          conversationId: parsed.data.conversationId ?? null,
          recipeId: parsed.data.recipeId ?? null,
          signal: request.signal,
        })) {
          send(controller, event);
          if (event.type === "final") track("chef_answer", user.id, { has_recipe: Boolean((event.message.payload as { recipe?: unknown } | null)?.recipe) });
        }
      } catch (error) {
        console.error("[chef] stream failed:", error instanceof Error ? error.name : "unknown");
        send(controller, { type: "error", code: "PROVIDER_ERROR" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
