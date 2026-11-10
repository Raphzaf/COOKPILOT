import "server-only";
import { getEntitlements, getQuota } from "@/lib/billing/entitlements";
import type { QuotaState } from "@/lib/billing/plans";
import type { DataStore } from "@/lib/data/store";
import type { ChatMessage, Locale, Recipe, SessionUser } from "@/lib/domain/types";
import { recipeIdsFromChunks, retrieveKnowledge } from "@/lib/rag/retrieve";
import { rateLimit } from "@/lib/rate-limit";
import { truncate } from "@/lib/utils";
import { approximateTokens, estimateCostUsd } from "./cost";
import { getLLMProvider } from "./index";
import { buildSystemPrompt } from "./prompts";
import { LLMError, type ChefContext, type LLMMessage, type LLMProvider } from "./provider";
import { chefResponseJsonSchema, chefResponseSchema, type ChefPayload, type ChefSource } from "./schema";
import { JsonStringFieldStream, parseJsonLoose } from "./stream-json";
import { validateChefResponse } from "./validate";

export type ChefErrorCode = "QUOTA_EXCEEDED" | "DAILY_LIMIT" | "RATE_LIMITED" | "NOT_FOUND" | "PROVIDER_ERROR" | "INVALID_RESPONSE";

export type ChefEvent =
  | { type: "meta"; conversationId: string; userMessageId: string }
  | { type: "delta"; text: string }
  | { type: "final"; message: ChatMessage; quota: QuotaState }
  | { type: "error"; code: ChefErrorCode; retryAfterSeconds?: number };

export interface ChefRequest {
  user: SessionUser;
  store: DataStore;
  locale: Locale;
  message: string;
  conversationId: string | null;
  recipeId: string | null;
  signal?: AbortSignal;
  /** Injectable for tests. */
  provider?: LLMProvider;
}

const MAX_HISTORY_MESSAGES = 10;
const MAX_HISTORY_CHARS = 1500;
const MAX_OUTPUT_TOKENS = 4096;
const BURST_LIMIT = 8;
const BURST_WINDOW_MS = 60_000;

function historyText(message: ChatMessage): string {
  if (message.role === "user") return truncate(message.content, MAX_HISTORY_CHARS);
  const payload = message.payload as ChefPayload | null;
  const recipe = payload?.recipe ? `\n[You proposed the recipe "${payload.recipe.title}" for ${payload.recipe.servings} servings.]` : "";
  return truncate(message.content, MAX_HISTORY_CHARS) + recipe;
}

/**
 * Runs one AI Chef turn: quota checks → retrieval → generation (streamed) → validation →
 * persistence → metering. Everything happens on the server; the client only sees events.
 */
export async function* runChef(request: ChefRequest): AsyncGenerator<ChefEvent> {
  const { user, store, locale } = request;
  const provider = request.provider ?? getLLMProvider();

  // 1 — Cost controls, cheapest check first.
  const burst = rateLimit(`chef:${user.id}`, BURST_LIMIT, BURST_WINDOW_MS);
  if (!burst.allowed) {
    yield { type: "error", code: "RATE_LIMITED", retryAfterSeconds: burst.retryAfterSeconds };
    return;
  }
  const { plan, limits } = await getEntitlements(store, user.id);
  const quota = await getQuota(store, user.id, plan);
  if (quota.remaining <= 0) {
    yield { type: "error", code: "QUOTA_EXCEEDED" };
    return;
  }
  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  if ((await store.countUsage(user.id, "chef_message", dayAgo)) >= limits.chefMessagesPerDay) {
    yield { type: "error", code: "DAILY_LIMIT" };
    return;
  }

  // 2 — Conversation (ownership is checked by the store / RLS).
  let history: ChatMessage[] = [];
  let conversationId = request.conversationId;
  if (conversationId) {
    const existing = await store.getConversation(user.id, conversationId);
    if (!existing) {
      yield { type: "error", code: "NOT_FOUND" };
      return;
    }
    history = existing.messages;
  } else {
    conversationId = (await store.createConversation(user.id, truncate(request.message, 70))).id;
  }
  const userMessage = await store.addMessage(user.id, conversationId, { role: "user", content: request.message, payload: null });
  yield { type: "meta", conversationId, userMessageId: userMessage.id };

  // 3 — Context: profile, appliances, retrieval.
  const [preferences, devices, focusRecipe] = await Promise.all([
    store.getPreferences(user.id),
    store.listUserDevices(user.id),
    request.recipeId ? store.getRecipeById(request.recipeId, locale, user.id) : Promise.resolve(null),
  ]);
  const retrievalQuery = focusRecipe ? `${focusRecipe.title} ${request.message}` : request.message;
  const retrieved = await retrieveKnowledge(store, provider, {
    query: retrievalQuery,
    locale,
    modelNumbers: devices.map((d) => d.model.modelNumber),
  });
  const recipes = (
    await Promise.all(recipeIdsFromChunks(retrieved).slice(0, 3).map((id) => store.getRecipeById(id, locale, user.id)))
  ).filter((r): r is Recipe => r !== null && r.id !== focusRecipe?.id);

  const context: ChefContext = {
    locale,
    displayName: user.profile.displayName,
    preferences,
    personalized: limits.personalizedRecipes,
    devices,
    retrieved,
    recipes,
    focusRecipe,
  };
  const system = buildSystemPrompt(context);
  const messages: LLMMessage[] = [
    ...history.slice(-MAX_HISTORY_MESSAGES).map((m) => ({ role: m.role, content: historyText(m) })),
    { role: "user" as const, content: request.message },
  ];

  // 4 — Generation, streamed.
  const timeout = AbortSignal.timeout(60_000);
  const signal = request.signal ? AbortSignal.any([request.signal, timeout]) : timeout;
  const replyStream = new JsonStringFieldStream("reply");
  let rawText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  try {
    for await (const event of provider.streamStructured({
      system,
      messages,
      jsonSchema: chefResponseJsonSchema,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.4,
      signal,
      context,
    })) {
      if (event.type === "text") {
        rawText += event.text;
        const delta = replyStream.push(event.text);
        if (delta) yield { type: "delta", text: delta };
      } else {
        inputTokens = event.inputTokens;
        outputTokens = event.outputTokens;
      }
    }
  } catch (error) {
    console.error("[chef] provider error", error instanceof LLMError ? { status: error.status, message: error.message } : "unexpected");
    yield { type: "error", code: "PROVIDER_ERROR" };
    return;
  }

  if (provider.isLLM && inputTokens === 0) {
    inputTokens = approximateTokens(system + messages.map((m) => m.content).join(""));
    outputTokens = approximateTokens(rawText);
  }
  const usageBase = {
    userId: user.id,
    model: provider.model,
    inputTokens,
    outputTokens,
    estimatedCostUsd: provider.isLLM ? estimateCostUsd(inputTokens, outputTokens) : 0,
    createdAt: new Date().toISOString(),
  };

  // 5 — Output validation: schema first, then appliance / safety guard-rails.
  let parsed;
  try {
    parsed = chefResponseSchema.safeParse(parseJsonLoose(rawText));
  } catch {
    parsed = null;
  }
  if (!parsed?.success) {
    await store.recordUsage({ ...usageBase, kind: "chef_message" }).catch(() => undefined);
    yield { type: "error", code: "INVALID_RESPONSE" };
    return;
  }
  const { response, warnings } = validateChefResponse(parsed.data, context);

  const sources: ChefSource[] = [];
  for (const chunk of retrieved) {
    if (chunk.docType === "recipe") continue;
    if (!sources.some((s) => s.title === chunk.documentTitle)) sources.push({ title: chunk.documentTitle, url: chunk.sourceUrl, docType: chunk.docType });
  }
  const payload: ChefPayload = { ...response, warnings, sources: sources.slice(0, 5), provider: provider.id, demoAnswer: !provider.isLLM };

  // 6 — Persist and meter.
  const assistantMessage = await store.addMessage(user.id, conversationId, { role: "assistant", content: response.reply, payload });
  await store.recordUsage({ ...usageBase, kind: "chef_message" });
  if (response.recipe) await store.recordUsage({ ...usageBase, kind: "recipe_generation", inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 });

  yield { type: "final", message: assistantMessage, quota: await getQuota(store, user.id, plan) };
}
