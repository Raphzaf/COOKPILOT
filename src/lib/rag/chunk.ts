import { createHash } from "node:crypto";

export interface ChunkOptions {
  /** Target maximum size of a chunk, in characters. */
  maxChars?: number;
  /** Characters of trailing context repeated at the start of the next chunk. */
  overlapChars?: number;
}

/** Normalises raw extracted text: unix newlines, collapsed spaces, no control characters. */
export function extractText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/<[^>]{1,200}>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function contentHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function splitLong(paragraph: string, maxChars: number): string[] {
  if (paragraph.length <= maxChars) return [paragraph];
  const sentences = paragraph.split(/(?<=[.!?])\s+|\n/);
  const parts: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      if (current) parts.push(current);
      current = "";
      for (let i = 0; i < sentence.length; i += maxChars) parts.push(sentence.slice(i, i + maxChars));
      continue;
    }
    if (current && current.length + sentence.length + 1 > maxChars) {
      parts.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * Paragraph-aware chunking with overlap. Paragraphs are kept together where possible so each
 * chunk stays a self-contained statement (important for appliance facts).
 */
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const maxChars = options.maxChars ?? 900;
  const overlapChars = Math.min(options.overlapChars ?? 120, Math.floor(maxChars / 3));
  const clean = extractText(text);
  if (!clean) return [];
  const paragraphs = clean.split(/\n{2,}/).flatMap((p) => splitLong(p.trim(), maxChars)).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > maxChars) {
      chunks.push(current);
      const tail = overlapChars > 0 ? current.slice(-overlapChars).replace(/^\S*\s/, "") : "";
      current = tail && tail.length + paragraph.length + 1 <= maxChars ? `${tail}\n${paragraph}` : paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
