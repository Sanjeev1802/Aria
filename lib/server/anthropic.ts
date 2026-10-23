import Anthropic from "@anthropic-ai/sdk";
import { ARIA_SYSTEM_PROMPT, withModelLine } from "./system-prompt";
import { WEB_SEARCH_UNITS_PER_REQUEST, type Rates } from "./metering";
import type { WebSource } from "./web-search";
import type { StreamProvider } from "./chat-service";
import { ServiceError } from "./errors";

export const DEFAULT_CLAUDE_MODEL = "claude-opus-5-5";

/** Anthropic list prices, USD per million tokens. ANTHROPIC_*_USD_PER_MILLION overrides them. */
const LIST_RATES: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

/** Models that accept the server-side refusal fallback (`fallbacks: "default"`). */
const SERVER_FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-sonnet-5-5", "claude-fable-5-1", "claude-opus-5"]);

const REFUSAL_NOTICE = "ARIA can't help with that request. Try rephrasing it or asking something else.";

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

let client: Anthropic | undefined;
function anthropic() {
  // One retry at most: the Nova fallback is the real recovery path, and the
  // chat request already has a 90-second overall timeout.
  return client ??= new Anthropic({ maxRetries: 1 });
}

const MAX_SOURCE_LINKS = 5;
/** A server-side search loop pauses after its iteration limit; resuming costs input again, so keep it short. */
const MAX_PAUSE_RESUMES = 2;

/**
 * The pages Claude's answer actually cites, as https links, deduplicated. Pages it merely saw in
 * search results are not listed: a link the answer does not rely on would mislead the reader.
 */
export function extractWebSources(content: readonly Anthropic.Beta.BetaContentBlock[]): WebSource[] {
  const cited: WebSource[] = [];
  for (const block of content) {
    if (block.type !== "text") continue;
    for (const citation of block.citations ?? []) {
      if (citation.type === "web_search_result_location") cited.push({ title: citation.title ?? citation.url, url: citation.url, snippet: "" });
    }
  }
  const unique = new Map<string, WebSource>();
  for (const source of cited) {
    if (/^https:\/\//i.test(source.url) && !unique.has(source.url)) unique.set(source.url, source);
  }
  return [...unique.values()].slice(0, MAX_SOURCE_LINKS);
}

export const streamClaude: StreamProvider = async function* (input, modelId, signal, request) {
  const messages: Anthropic.Beta.BetaMessageParam[] = input.messages.map((message, index) => ({
    role: message.role,
    content: [
      ...message.content.map(part => ({ type: "text" as const, text: part.text })),
      // Untrusted web excerpts ride on the final user turn, as with Bedrock.
      ...(request.webContext && index === input.messages.length - 1 ? [{ type: "text" as const, text: request.webContext }] : []),
    ],
  }));
  const search = request.webSearchTool;
  let streamedText = false;
  let inputTokens = 0;
  let outputTokens = 0;
  let searches = 0;
  const sources: WebSource[] = [];
  let message: Anthropic.Beta.BetaMessage;
  for (let resumes = 0; ; resumes++) {
    const stream = anthropic().beta.messages.stream({
      model: modelId,
      max_tokens: request.maxOutputTokens,
      // The static prompt is cached; the per-request context block follows it so it never invalidates the cache.
      system: [
        { type: "text", text: ARIA_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: withModelLine(request.runtimeContext, `Claude (${modelId}) by Anthropic`) },
      ],
      messages,
      // Chat answers do well at low effort; thinking stays adaptive (it cannot be disabled on current models).
      output_config: { effort: "low" },
      // The basic search tool works on every Claude model and is the cheapest variant. max_uses caps the
      // per-message fee; each search costs about $0.01.
      ...(search ? { tools: [{ type: "web_search_20250305" as const, name: "web_search" as const, max_uses: search.maxUses }] } : {}),
      ...(SERVER_FALLBACK_MODELS.has(modelId) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    }, { signal });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta" && event.delta.text) {
        streamedText = true;
        yield { text: event.delta.text };
      }
    }
    message = await stream.finalMessage();
    const usage = message.usage;
    // Cached prompt tokens are billed as ordinary input: simpler, and never undercharges.
    inputTokens += usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
    outputTokens += usage.output_tokens;
    searches += usage.server_tool_use?.web_search_requests ?? 0;
    for (const source of extractWebSources(message.content)) if (!sources.some(known => known.url === source.url)) sources.push(source);
    if (message.stop_reason !== "pause_turn" || resumes >= MAX_PAUSE_RESUMES) break;
    messages.push({ role: "assistant", content: message.content as Anthropic.Beta.BetaContentBlockParam[] });
  }
  if (message.stop_reason === "refusal") {
    // Every model in the fallback chain declined. Say so instead of an empty or half answer.
    yield { text: streamedText ? `\n\n${REFUSAL_NOTICE}` : REFUSAL_NOTICE };
  }
  yield {
    usage: { inputTokens, outputTokens },
    // Searches are billed per request on top of tokens.
    extraUnits: searches * WEB_SEARCH_UNITS_PER_REQUEST,
    sources: sources.slice(0, MAX_SOURCE_LINKS),
    finishReason: message.stop_reason === "max_tokens" || message.stop_reason === "pause_turn" ? "max_tokens"
      : message.stop_reason === "stop_sequence" ? "stop_sequence" : "end_turn",
  };
};
