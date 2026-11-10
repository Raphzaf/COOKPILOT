import "server-only";
import { serverEnv } from "@/lib/env";
import { createGeminiProvider } from "./gemini";
import { libraryProvider } from "./library-provider";
import type { LLMProvider } from "./provider";

/**
 * Provider registry. To add a provider, implement LLMProvider and return it here
 * (for example behind an AI_PROVIDER environment variable).
 */
export function getLLMProvider(): LLMProvider {
  const key = serverEnv.geminiApiKey;
  if (key) return createGeminiProvider(key, serverEnv.geminiModel, serverEnv.geminiEmbeddingModel);
  return libraryProvider;
}
