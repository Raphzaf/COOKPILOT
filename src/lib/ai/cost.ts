/**
 * Cost ESTIMATES for monitoring only — not billing data. Defaults are indicative list prices
 * per million tokens and can be overridden with AI_INPUT_COST_PER_MTOK_USD / AI_OUTPUT_COST_PER_MTOK_USD.
 */
const DEFAULT_INPUT_PER_MTOK = 0.3;
const DEFAULT_OUTPUT_PER_MTOK = 2.5;

function price(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= 0 && process.env[name] ? parsed : fallback;
}

export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  const cost =
    (inputTokens / 1_000_000) * price("AI_INPUT_COST_PER_MTOK_USD", DEFAULT_INPUT_PER_MTOK) +
    (outputTokens / 1_000_000) * price("AI_OUTPUT_COST_PER_MTOK_USD", DEFAULT_OUTPUT_PER_MTOK);
  return Math.round(cost * 1_000_000) / 1_000_000;
}

/** Rough token estimate (≈4 characters per token) for when a provider reports no usage. */
export function approximateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
