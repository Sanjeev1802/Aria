import { createHash, randomUUID } from "node:crypto";
import type { ChatInput } from "./chat-input";
import { ARIA_SYSTEM_PROMPT, PROMPT_VERSION, runtimeContext, type PromptSession } from "./system-prompt";
import { chargeUnits, WEB_SEARCH_UNITS_PER_REQUEST, type Rates, type Usage } from "./metering";
import { ServiceError } from "./errors";
import type { Account, CreditLedger } from "./accounting/credit-ledger";
import { MAX_WEB_CONTEXT_BYTES, WebSearchError, boundedWebContext, searchQuery, webSourceLinks, type WebSearchProvider, type WebSource } from "./web-search";
import { builtinReply } from "./builtin-replies";
import { messageCacheEligible, readMessageCache, writeMessageCache } from "./cache/message-cache";
import type { SearchCache } from "./cache/search-cache";

/** What the server adds to a model call beyond the conversation itself. */
export type ProviderRequest = {
  /** Second system block: date, who is asking, web-search state, and length budget. */
  runtimeContext: string;
  /** Untrusted numbered web excerpts, appended to the last user turn. */
  webContext?: string;
  /** Set when the provider may search the web itself (Claude's web search tool) if the question needs live facts. */
  webSearchTool?: { maxUses: number };
  maxOutputTokens: number;
};

/** Set on the usage event when a different model than the one reserved for answered (provider fallback). */
export type ServedBy = { modelId: string; rates: Rates };

export type StreamProvider = (input: ChatInput, model: string, signal: AbortSignal, request: ProviderRequest) =>
  AsyncIterable<{ text: string } | {
    usage: Usage; finishReason?: "end_turn" | "max_tokens" | "stop_sequence"; servedBy?: ServedBy;
    /** Charges beyond token usage, in ledger units (for example web search fees). */
    extraUnits?: number;
    /** Pages the provider used, shown to the user as links under the answer. */
    sources?: WebSource[];
  }>;

/** Generous allowance for the tokens one web search adds to the prompt (results are a few thousand tokens). */
const NATIVE_SEARCH_TOKENS_PER_USE = 15_000;

export async function createChatResponse(input: ChatInput, options: {
  ledger: CreditLedger; account: Account; modelId: string; rates: Rates;
  provider: StreamProvider; signal: AbortSignal; maxOutputTokens: number;
  webSearch?: WebSearchProvider;
  /** The provider searches the web itself, at most `maxUses` times per message. */
  nativeSearch?: { maxUses: number };
  session?: PromptSession;
  onComplete?: (text: string) => Promise<void>;
  /** Optional ElastiCache layer for repeat first-turn questions (30-day TTL). */
  messageCache?: SearchCache;
}): Promise<Response> {
  const canned = builtinReply(input);
  if (canned) return streamBuiltinReply(input, canned, options.signal, options.onComplete);
  const { ledger, account, modelId, rates } = options;
  const cacheContext = { webSearch: Boolean(options.webSearch), nativeSearch: Boolean(options.nativeSearch) };
  if (options.messageCache && messageCacheEligible(input, cacheContext)) {
    const cached = await readMessageCache(options.messageCache, input, modelId);
    if (cached) {
      return streamBuiltinReply(input, cached, options.signal, options.onComplete, { cacheStatus: "hit" });
    }
  }
  const workspaceId = account.workspaceId;
  const hash = createHash("sha256").update(JSON.stringify({ input, modelId, rates, prompt: PROMPT_VERSION, webSearch: Boolean(options.webSearch), nativeSearch: options.nativeSearch?.maxUses ?? 0 })).digest("hex");
  const runtime = runtimeContext({ now: new Date(), session: options.session, webSearch: Boolean(options.webSearch), webSearchTool: Boolean(options.nativeSearch),
    maxOutputTokens: options.maxOutputTokens });
  // Search results count as input tokens, and every search carries a fee: reserve the worst case up front.
  const searchUses = options.nativeSearch?.maxUses ?? 0;
  const inputBound = (Buffer.byteLength(JSON.stringify(input.messages) + ARIA_SYSTEM_PROMPT + runtime, "utf8") +
    (options.webSearch ? MAX_WEB_CONTEXT_BYTES : 0)) * 2 + 2048 + searchUses * NATIVE_SEARCH_TOKENS_PER_USE;
  const units = chargeUnits({ inputTokens: inputBound, outputTokens: options.maxOutputTokens }, rates) +
    searchUses * WEB_SEARCH_UNITS_PER_REQUEST;
  const existing = await ledger.reserve(account, { id: input.id, hash, units, model: modelId, rateVersion: rates.version });
  if (existing && existing.status !== "completed") throw new ServiceError("request_already_processed_or_pending", 409);
  const abort = new AbortController();
  const signal = AbortSignal.any([options.signal, abort.signal, AbortSignal.timeout(90_000)]);
  const messageId = randomUUID();
  const encoder = new TextEncoder();
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (payload: object) => {
        if (!cancelled) controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      const content = (delta: string) => emit({ type: "TEXT_MESSAGE_CONTENT", messageId, delta });
      const finish = () => {
        content('")');
        emit({ type: "TEXT_MESSAGE_END", messageId });
        emit({ type: "RUN_FINISHED", threadId: "aria", runId: input.id });
      };
      emit({ type: "RUN_STARTED", threadId: "aria", runId: input.id });
      emit({ type: "TEXT_MESSAGE_START", messageId, role: "assistant" });
      content('root = TextContent("');
      if (existing) {
        await options.onComplete?.(String(existing.response ?? "")).catch(() => logLedgerIssue("thread_save_deferred", account, input.id));
        content(JSON.stringify(String(existing.response ?? "")).slice(1, -1));
        finish();
        if (!cancelled) controller.close();
        return;
      }
      let text = "";
      let usage: Usage | undefined;
      let finishReason: "end_turn" | "max_tokens" | "stop_sequence" | undefined;
      let servedBy: ServedBy | undefined;
      let extraUnits = 0;
      let providerSources: WebSource[] = [];
      let answerSources: WebSource[] = [];
      try {
        const results = options.webSearch ? await options.webSearch(searchQuery(input.messages.at(-1)!.content[0].text), signal) : [];
        const { context, sources } = boundedWebContext(results);
        if (options.webSearch && sources.length === 0) throw new WebSearchError("No public web results were found. No credits were charged. Try a different question or turn Web search off.");
        await ledger.markProviderStarted(workspaceId, input.id);
        for await (const event of options.provider(input, modelId, signal, {
          runtimeContext: runtime, webContext: sources.length ? context : undefined, maxOutputTokens: options.maxOutputTokens,
          webSearchTool: options.nativeSearch,
        })) {
          signal.throwIfAborted();
          if ("text" in event) {
            text += event.text;
            if (text.length > 100_000) throw new Error("Output limit exceeded");
            content(JSON.stringify(event.text).slice(1, -1));
          } else { usage = event.usage; finishReason = event.finishReason; servedBy = event.servedBy;
            extraUnits = event.extraUnits ?? 0; providerSources = event.sources ?? []; }
        }
        signal.throwIfAborted();
        if (!usage || !text.trim()) throw new Error("Response or usage missing");
        if (finishReason === "max_tokens") {
          const notice = "\n\nResponse reached the model's length limit. Ask ARIA to continue if you need the rest.";
          text += notice;
          content(JSON.stringify(notice).slice(1, -1));
        }
        answerSources = sources.length ? sources : providerSources;
        if (answerSources.length) {
          const links = webSourceLinks(answerSources);
          text += links;
          content(JSON.stringify(links).slice(1, -1));
        }
      } catch (error) {
        // Incomplete/cancelled responses are not customer-billed; AWS may still bill us.
        await ledger.fail(workspaceId, input.id).catch(() => logLedgerIssue("release_deferred", account, input.id));
        if (!signal.aborted) await ledger.recordModelUse({ modelId: servedBy?.modelId ?? modelId, fallback: Boolean(servedBy), ok: false });
        emit(chatFailure(error));
        if (!cancelled) controller.close();
        return;
      }
      // Never settle above the reservation: a long search result must not turn a delivered answer into a failed settlement.
      const charged = Math.min(chargeUnits(usage, servedBy?.rates ?? rates) + extraUnits, units);
      const settlement = { charged, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, response: text };
      if (!await settleWithRetry(ledger, workspaceId, input.id, settlement)) {
        // The answer was delivered; leave the hold for reconciliation rather than releasing it for free.
        logLedgerIssue("settlement_deferred", account, input.id);
      }
      await options.onComplete?.(text).catch(() => logLedgerIssue("thread_save_deferred", account, input.id));
      const usedWeb = answerSources.length > 0 || extraUnits > 0;
      if (options.messageCache && messageCacheEligible(input, cacheContext) && !usedWeb) {
        await writeMessageCache(options.messageCache, input, modelId, text);
      }
      await ledger.recordModelUse({ modelId: servedBy?.modelId ?? modelId, fallback: Boolean(servedBy), ok: true });
      finish();
      if (!cancelled) controller.close();
    },
    cancel() { cancelled = true; abort.abort(); },
  });
  return chatStreamResponse(body, input.id, "miss");
}

function chatStreamResponse(body: ReadableStream<Uint8Array>, requestId: string, cacheStatus: "hit" | "miss") {
  return new Response(body, { headers: {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    "X-Accel-Buffering": "no",
    "X-Request-Id": requestId,
    "X-Aria-Response-Cache": cacheStatus,
  } });
}

function streamBuiltinReply(
  input: ChatInput,
  text: string,
  signal: AbortSignal,
  onComplete?: (text: string) => Promise<void>,
  meta?: { cacheStatus?: "hit" | "builtin" },
) {
  const messageId = randomUUID();
  const encoder = new TextEncoder();
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (payload: object) => {
        if (!cancelled) controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      emit({ type: "RUN_STARTED", threadId: "aria", runId: input.id });
      emit({ type: "TEXT_MESSAGE_START", messageId, role: "assistant" });
      emit({ type: "TEXT_MESSAGE_CONTENT", messageId, delta: 'root = TextContent("' });
      try {
        signal.throwIfAborted();
        emit({ type: "TEXT_MESSAGE_CONTENT", messageId, delta: JSON.stringify(text).slice(1, -1) });
        await onComplete?.(text).catch(() => undefined);
        emit({ type: "TEXT_MESSAGE_CONTENT", messageId, delta: '")' });
        emit({ type: "TEXT_MESSAGE_END", messageId });
        emit({ type: "RUN_FINISHED", threadId: "aria", runId: input.id });
      } catch {
        emit({ type: "RUN_ERROR", code: "response_failed", message: "ARIA could not finish this response. Try again." });
      }
      if (!cancelled) controller.close();
    },
    cancel() { cancelled = true; },
  });
  return chatStreamResponse(body, input.id, meta?.cacheStatus === "hit" ? "hit" : "miss");
}

function chatFailure(error: unknown) {
  if (error instanceof WebSearchError) return { type: "RUN_ERROR", code: "web_search_failed", message: error.message };
  if (error instanceof Error && error.name === "ThrottlingException") {
    const dailyLimit = /tokens per day/i.test(error.message);
    return { type: "RUN_ERROR", code: "model_quota_exceeded", message: dailyLimit
      ? "Amazon Bedrock's daily token limit has been reached. No credits were charged. Try again after the AWS quota resets or ask an administrator to increase it."
      : "Amazon Bedrock is temporarily rate limiting requests. No credits were charged. Try again shortly." };
  }
  if (error instanceof Error && error.name === "AccessDeniedException") {
    return { type: "RUN_ERROR", code: "model_access_denied", message: "ARIA cannot access its configured AI model. No credits were charged. Please contact an administrator to check Bedrock access." };
  }
  return { type: "RUN_ERROR", code: "response_failed", message: "ARIA could not finish this response. No credits were charged for an incomplete response. Try again." };
}

async function settleWithRetry(ledger: CreditLedger, workspaceId: string, id: string, s: Parameters<CreditLedger["settle"]>[2]) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { await ledger.settle(workspaceId, id, s); return true; }
    catch { await new Promise(r => setTimeout(r, 50 * 2 ** attempt)); }
  }
  return false;
}

function logLedgerIssue(event: string, account: Account, requestId: string) {
  console.error(JSON.stringify({ level: "error", event, workspaceId: account.workspaceId, memberId: account.memberId, requestId }));
}
