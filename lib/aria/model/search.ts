/**
 * Live-search policy.
 *
 * Bedrock does not ship Google Search grounding. These helpers stay so a
 * Tavily/Brave (or Bedrock web) tool can plug in later without rewriting
 * chat. Until then, generateAriaReply reports search as disabled/unavailable.
 */

const COOLDOWN_MS = 15 * 60 * 1000;

let groundingBlockedUntil = 0;

/** Signals that clearly point at the open web. */
const LIVE_PATTERNS: RegExp[] = [
  /\b(news|headline|headlines|breaking)\b/i,
  /\b(latest|current|currently|recent|recently|today|tonight|yesterday|this (week|month|year)|right now|so far)\b/i,
  /\b(stock|share price|market cap|exchange rate|forex|inflation|interest rate)\b/i,
  // "who is X" is a lookup; "who are you/we" is about ARIA itself.
  /\bwho (won|is|are)\b(?!\s+(you|we|u|they)\b)/i,
  /\b(what happened|what's happening|whats happening)\b/i,
  /\b(price of|cost of|how much (is|does))\b/i,
  /\b(announced|launched|released|acquired|funding round|ipo)\b/i,
  /\b(20[2-9]\d)\b/,
  /\bsearch (the web|online|for)\b/i,
  /\blook (this |it )?up\b/i,
];

/**
 * Heuristic gate. Errs toward not searching: a missed search costs a little
 * freshness, an unnecessary one can burn the whole daily grounding allowance.
 */
export function messageNeedsLiveSearch(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return LIVE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function isGroundingCoolingDown() {
  return Date.now() < groundingBlockedUntil;
}

export function startGroundingCooldown(durationMs = COOLDOWN_MS) {
  groundingBlockedUntil = Date.now() + durationMs;
}

export function clearGroundingCooldown() {
  groundingBlockedUntil = 0;
}

/** True when the provider rejected the call for quota or rate limiting. */
export function isQuotaError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message;
  if (/RESOURCE_EXHAUSTED|exceeded your current quota/i.test(message)) {
    return true;
  }
  try {
    const parsed = JSON.parse(message) as { error?: { code?: number } };
    return parsed.error?.code === 429;
  } catch {
    return /\b429\b/.test(message);
  }
}
