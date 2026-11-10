/**
 * Embeds every knowledge chunk that has no embedding yet (e.g. after running the SQL seeds,
 * or for documents added before GEMINI_API_KEY was configured).
 *
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… GEMINI_API_KEY=… npm run knowledge:ingest
 */
import { createClient } from "@supabase/supabase-js";

const DIMENSIONS = 768;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const gemini = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
  if (!url || !key || !gemini) throw new Error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY must be set.");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  let total = 0;
  for (;;) {
    const { data, error } = await supabase.from("knowledge_chunks").select("id, content, document:knowledge_documents(title)").is("embedding", null).limit(50);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as { id: string; content: string; document: { title: string } | null }[];
    if (rows.length === 0) break;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": gemini },
      body: JSON.stringify({
        requests: rows.map((row) => ({
          model: `models/${model}`,
          content: { parts: [{ text: `${row.document?.title ?? ""}\n${row.content}` }] },
          taskType: "RETRIEVAL_DOCUMENT",
          outputDimensionality: DIMENSIONS,
        })),
      }),
    });
    if (!response.ok) throw new Error(`Embedding request failed (${response.status}).`);
    const json = (await response.json()) as { embeddings: { values: number[] }[] };
    for (let i = 0; i < rows.length; i++) {
      const values = json.embeddings[i]?.values;
      if (!values || values.length !== DIMENSIONS) throw new Error("Unexpected embedding size.");
      const update = await supabase.from("knowledge_chunks").update({ embedding: values }).eq("id", rows[i]!.id);
      if (update.error) throw new Error(update.error.message);
    }
    total += rows.length;
    console.log(`embedded ${total} chunks…`);
  }
  console.log(`✔ Done. ${total} chunk(s) embedded.`);
}

main().catch((error: Error) => {
  console.error(`✖ ${error.message}`);
  process.exit(1);
});
