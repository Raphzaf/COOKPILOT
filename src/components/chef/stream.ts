import type { ChefEvent } from "@/lib/ai/chef";

export interface ChefStreamRequest {
  conversationId?: string | null;
  message: string;
  locale: string;
  recipeId?: string | null;
}

/** Calls the AI Chef endpoint and dispatches server-sent events as they arrive. */
export async function streamChef(request: ChefStreamRequest, onEvent: (event: ChefEvent) => void, signal?: AbortSignal): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/chef/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
  } catch {
    onEvent({ type: "error", code: "PROVIDER_ERROR" });
    return;
  }
  if (!response.ok || !response.body) {
    const code = response.status === 401 ? "NOT_FOUND" : "PROVIDER_ERROR";
    onEvent({ type: "error", code });
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const line = block.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        try {
          const event = JSON.parse(line.slice(5).trim()) as ChefEvent;
          if (event.type === "final" || event.type === "error") finished = true;
          onEvent(event);
        } catch {
          // Ignore malformed frames.
        }
      }
    }
  } catch {
    // Network interruption: reported below.
  }
  if (!finished && !signal?.aborted) onEvent({ type: "error", code: "PROVIDER_ERROR" });
}
