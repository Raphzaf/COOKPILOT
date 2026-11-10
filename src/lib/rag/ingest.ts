import type { LLMProvider } from "@/lib/ai/provider";
import type { DataStore, KnowledgeDocumentInput } from "@/lib/data/store";
import type { KnowledgeDocument } from "@/lib/domain/types";
import { chunkText, contentHash, extractText } from "./chunk";

export type IngestMeta = Omit<KnowledgeDocumentInput, "contentHash" | "chunks">;

export interface IngestResult {
  document: KnowledgeDocument;
  chunkCount: number;
  embedded: boolean;
}

/**
 * Ingestion pipeline: extract → hash (de-duplicate) → chunk → embed → store.
 * Embeddings are optional: without an embedding provider the chunks are stored and served
 * by full-text search until they are embedded later.
 */
export async function ingestDocument(store: DataStore, provider: LLMProvider, meta: IngestMeta, rawText: string): Promise<IngestResult> {
  const text = extractText(rawText);
  if (text.length < 40) throw new Error("DOCUMENT_TOO_SHORT");
  if (text.length > 400_000) throw new Error("DOCUMENT_TOO_LARGE");
  const chunks = chunkText(text);
  let embeddings: number[][] | null = null;
  try {
    embeddings = await provider.embed(chunks.map((c) => `${meta.title}\n${c}`), "document");
  } catch {
    embeddings = null;
  }
  const document = await store.ingestKnowledgeDocument({
    ...meta,
    contentHash: contentHash(text),
    chunks: chunks.map((content, i) => ({ content, embedding: embeddings?.[i] ?? null })),
  });
  return { document, chunkCount: chunks.length, embedded: embeddings !== null };
}
