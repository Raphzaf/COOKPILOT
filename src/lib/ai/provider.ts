import type { Locale, Recipe, RetrievedChunk, UserDevice, UserPreferences } from "@/lib/domain/types";

/** Everything the chef knows about the user for one request. Built server-side only. */
export interface ChefContext {
  locale: Locale;
  displayName: string | null;
  preferences: UserPreferences;
  /** Whether stored tastes may be used (Pro: personalised recipes). */
  personalized: boolean;
  devices: UserDevice[];
  retrieved: RetrievedChunk[];
  /** Library recipes surfaced by retrieval, with full structure. */
  recipes: Recipe[];
  /** Recipe the user is currently looking at, if any. */
  focusRecipe: Recipe | null;
}

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  system: string;
  messages: LLMMessage[];
  /** Provider-specific JSON schema for structured output. */
  jsonSchema: unknown;
  maxOutputTokens: number;
  temperature: number;
  signal?: AbortSignal;
  /** Structured context; real LLM providers ignore it (it is already in `system`). */
  context: ChefContext;
}

export type LLMStreamEvent =
  | { type: "text"; text: string }
  | { type: "usage"; inputTokens: number; outputTokens: number };

/**
 * Provider-agnostic LLM interface. Adding a provider (OpenAI, Anthropic, Mistral…) means
 * implementing this interface in one file and registering it in ./index.ts — nothing else changes.
 */
export interface LLMProvider {
  readonly id: string;
  readonly model: string;
  /** False for the built-in library-only fallback used when no API key is configured. */
  readonly isLLM: boolean;
  /** Streams a JSON document matching `jsonSchema` as raw text deltas. */
  streamStructured(request: LLMRequest): AsyncIterable<LLMStreamEvent>;
  /** Returns one embedding per input text, or null when the provider has no embedding model. */
  embed(texts: string[], purpose: "document" | "query"): Promise<number[][] | null>;
}

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

export const EMBEDDING_DIMENSIONS = 768;
