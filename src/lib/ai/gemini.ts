import "server-only";
import { EMBEDDING_DIMENSIONS, LLMError, type LLMProvider, type LLMRequest, type LLMStreamEvent } from "./provider";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

interface GeminiChunk {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  promptFeedback?: { blockReason?: string };
}

/**
 * Google Gemini provider. All Gemini-specific code lives in this file.
 * Uses the REST API directly (no SDK) and never runs in the browser.
 */
export function createGeminiProvider(apiKey: string, model: string, embeddingModel: string): LLMProvider {
  const headers = { "content-type": "application/json", "x-goog-api-key": apiKey };

  return {
    id: "gemini",
    model,
    isLLM: true,

    async *streamStructured(request: LLMRequest): AsyncIterable<LLMStreamEvent> {
      const response = await fetch(`${BASE_URL}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
        method: "POST",
        headers,
        signal: request.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.system }] },
          contents: request.messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
          generationConfig: {
            temperature: request.temperature,
            maxOutputTokens: request.maxOutputTokens,
            responseMimeType: "application/json",
            responseSchema: request.jsonSchema,
          },
        }),
      });
      if (!response.ok || !response.body) {
        // The upstream body can contain request details; keep only the status for callers.
        await response.body?.cancel().catch(() => undefined);
        throw new LLMError(`Gemini request failed (${response.status})`, response.status, response.status === 429 || response.status >= 500);
      }

      const decoder = new TextDecoder();
      const reader = response.body.getReader();
      let buffer = "";
      let inputTokens = 0;
      let outputTokens = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newline: number;
          while ((newline = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            let chunk: GeminiChunk;
            try {
              chunk = JSON.parse(data) as GeminiChunk;
            } catch {
              continue;
            }
            if (chunk.promptFeedback?.blockReason) throw new LLMError("The request was blocked by the model's safety filters", 400);
            for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
              if (part.text && !part.thought) yield { type: "text", text: part.text };
            }
            if (chunk.usageMetadata) {
              inputTokens = chunk.usageMetadata.promptTokenCount ?? inputTokens;
              outputTokens = (chunk.usageMetadata.candidatesTokenCount ?? 0) + (chunk.usageMetadata.thoughtsTokenCount ?? 0) || outputTokens;
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      yield { type: "usage", inputTokens, outputTokens };
    },

    async embed(texts, purpose) {
      if (texts.length === 0) return [];
      const out: number[][] = [];
      // The batch endpoint accepts up to 100 requests.
      for (let i = 0; i < texts.length; i += 100) {
        const batch = texts.slice(i, i + 100);
        const response = await fetch(`${BASE_URL}/models/${encodeURIComponent(embeddingModel)}:batchEmbedContents`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            requests: batch.map((text) => ({
              model: `models/${embeddingModel}`,
              content: { parts: [{ text }] },
              taskType: purpose === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
              outputDimensionality: EMBEDDING_DIMENSIONS,
            })),
          }),
        });
        if (!response.ok) throw new LLMError(`Gemini embedding request failed (${response.status})`, response.status, response.status >= 500);
        const json = (await response.json()) as { embeddings?: { values?: number[] }[] };
        for (const item of json.embeddings ?? []) {
          if (!item.values || item.values.length !== EMBEDDING_DIMENSIONS) throw new LLMError("Unexpected embedding size");
          out.push(item.values);
        }
      }
      if (out.length !== texts.length) throw new LLMError("Embedding count mismatch");
      return out;
    },
  };
}
