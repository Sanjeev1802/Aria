import type { Rates } from "./metering";
import { ServiceError } from "./errors";

export const DEFAULT_CLAUDE_MODEL = "claude-opus-5-5";

/** Anthropic list prices, USD per million tokens. ANTHROPIC_*_USD_PER_MILLION overrides them. */
const LIST_RATES: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

export function claudeConfigured(env: Record<string, string | undefined> = process.env) {
  return Boolean(env.ANTHROPIC_API_KEY?.trim());
}

export function claudeModelConfig(env: Record<string, string | undefined> = process.env): { id: string; rates: Rates } {
  const id = env.ANTHROPIC_MODEL_ID?.trim() || DEFAULT_CLAUDE_MODEL;
  const input = Number(env.ANTHROPIC_INPUT_USD_PER_MILLION ?? LIST_RATES[id]?.input);
  const output = Number(env.ANTHROPIC_OUTPUT_USD_PER_MILLION ?? LIST_RATES[id]?.output);
  if (!Number.isFinite(input) || !Number.isFinite(output) || input <= 0 || output <= 0) {
    throw new ServiceError("model_or_rates_not_configured", 503);
  }
  return { id, rates: { input, output, version: env.ANTHROPIC_RATE_VERSION?.trim() || `anthropic-list-${id}` } };
}
