export type Rates = { input: number; output: number; version: string };

/** Anthropic charges $10 per 1,000 web searches ($0.01 each); billed at the same 3x as model tokens. */
export const WEB_SEARCH_UNITS_PER_REQUEST = 30_000;
export type Usage = { inputTokens: number; outputTokens: number };

// Integer millicredits: 1,000 units = 1 credit; 1 credit = $0.001 retail value.
// input/output rates are USD per million tokens. 3x model cost + 0.5 credit.
export function chargeUnits(usage: Usage, rates: Rates): number {
  for (const n of [usage.inputTokens, usage.outputTokens]) {
    if (!Number.isSafeInteger(n) || n < 0) throw new Error("Invalid token usage");
  }
  for (const n of [rates.input, rates.output]) {
    if (!Number.isFinite(n) || n < 0) throw new Error("Invalid model rate");
  }
  const units = Math.ceil(3 * (usage.inputTokens * rates.input + usage.outputTokens * rates.output)) + 500;
  if (!Number.isSafeInteger(units)) throw new Error("Usage exceeds accounting limit");
  return units;
}
