import type { KnowledgeChunk, RetrievedChunk } from "@/lib/domain/types";
import { normalizeText } from "@/lib/utils";

const STOPWORDS = new Set(
  "a an the and or of to in on for with my your our is are do does how what i we you it this that can make want have using use at by from as be me de la le les un une des du et ou en au aux pour avec mon ma mes ton ta tes est sont que qui quoi comment je tu il nous vous on ce cette ces dans sur par faire veux ai avoir utiliser".split(
    " ",
  ),
);

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t));
}

export interface ChunkFilter {
  language?: string;
  /** Chunks tied to a model are only kept when the model is in this list; model-agnostic chunks always pass. */
  modelNumbers?: string[];
  docTypes?: string[];
}

export function passesFilter(chunk: KnowledgeChunk, filter: ChunkFilter): boolean {
  if (filter.language && chunk.language !== filter.language) return false;
  if (filter.docTypes && !filter.docTypes.includes(chunk.docType)) return false;
  if (filter.modelNumbers && chunk.modelNumber && !filter.modelNumbers.includes(chunk.modelNumber)) return false;
  return true;
}

/**
 * BM25 ranking over an in-memory corpus. Used in demo mode and as the fallback whenever
 * embeddings are unavailable, so retrieval works without any external service.
 */
export function lexicalSearch(query: string, chunks: KnowledgeChunk[], filter: ChunkFilter, limit: number): RetrievedChunk[] {
  const corpus = chunks.filter((c) => passesFilter(c, filter));
  const queryTokens = [...new Set(tokenize(query))];
  if (queryTokens.length === 0 || corpus.length === 0) return [];

  const docs = corpus.map((chunk) => {
    const tokens = tokenize(`${chunk.documentTitle} ${chunk.modelNumber ?? ""} ${chunk.content}`);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { chunk, tf, length: tokens.length };
  });
  const avgLength = docs.reduce((sum, d) => sum + d.length, 0) / docs.length || 1;
  const df = new Map<string, number>();
  for (const token of queryTokens) df.set(token, docs.filter((d) => d.tf.has(token)).length);

  const k1 = 1.4;
  const b = 0.75;
  const scored: RetrievedChunk[] = [];
  for (const doc of docs) {
    let score = 0;
    for (const token of queryTokens) {
      const f = doc.tf.get(token) ?? 0;
      if (f === 0) continue;
      const n = df.get(token) ?? 0;
      const idf = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
      score += (idf * (f * (k1 + 1))) / (f + k1 * (1 - b + (b * doc.length) / avgLength));
    }
    if (score > 0) scored.push({ ...doc.chunk, score });
  }
  return scored.sort((a, b2) => b2.score - a.score).slice(0, limit);
}
