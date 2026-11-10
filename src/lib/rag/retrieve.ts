import type { LLMProvider } from "@/lib/ai/provider";
import type { DataStore } from "@/lib/data/store";
import type { Locale, RetrievedChunk } from "@/lib/domain/types";

const EMBED_CACHE_MAX = 200;
const embedCache = new Map<string, number[]>();

async function embedQuery(provider: LLMProvider, query: string): Promise<number[] | null> {
  const key = `${provider.id}:${provider.model}:${query}`;
  const cached = embedCache.get(key);
  if (cached) return cached;
  try {
    const result = await provider.embed([query], "query");
    const vector = result?.[0] ?? null;
    if (vector) {
      if (embedCache.size >= EMBED_CACHE_MAX) embedCache.delete(embedCache.keys().next().value!);
      embedCache.set(key, vector);
    }
    return vector;
  } catch {
    // Retrieval must never fail the request: fall back to lexical search.
    return null;
  }
}

export interface RetrieveOptions {
  query: string;
  locale: Locale;
  /** Model numbers of the user's appliances: documentation for other models is filtered out. */
  modelNumbers: string[];
  limit?: number;
}

/** Semantic search (pgvector) when embeddings are available, lexical search otherwise. */
export async function retrieveKnowledge(store: DataStore, provider: LLMProvider, options: RetrieveOptions): Promise<RetrievedChunk[]> {
  const embedding = await embedQuery(provider, options.query);
  return store.searchKnowledge({
    query: options.query,
    embedding,
    filter: { language: options.locale, modelNumbers: options.modelNumbers },
    limit: options.limit ?? 8,
  });
}

/** Library recipe ids referenced by retrieved recipe chunks (see `[recipe:<id>]` markers). */
export function recipeIdsFromChunks(chunks: RetrievedChunk[]): string[] {
  const ids: string[] = [];
  for (const chunk of chunks) {
    const match = /\[recipe:([0-9a-f-]{36})\]/i.exec(chunk.content);
    if (match?.[1] && !ids.includes(match[1])) ids.push(match[1]);
  }
  return ids;
}
