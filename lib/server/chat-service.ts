import { createHash, randomUUID } from "node:crypto";
import type { ChatInput } from "./chat-input";
import { ARIA_SYSTEM_PROMPT, PROMPT_VERSION, runtimeContext, type PromptSession } from "./system-prompt";
import { chargeUnits, type Rates, type Usage } from "./metering";
import { ServiceError } from "./errors";
import type { Account, CreditLedger } from "./accounting/credit-ledger";
import { MAX_WEB_CONTEXT_BYTES, WebSearchError, boundedWebContext, searchQuery, webSourceLinks, type WebSearchProvider } from "./web-search";

/** What the server adds to a model call beyond the conversation itself. */
export type ProviderRequest = {
  /** Second system block: date, who is asking, web-search state, and length budget. */
  runtimeContext: string;
  /** Untrusted numbered web excerpts, appended to the last user turn. */
  webContext?: string;
  maxOutputTokens: number;
};

/** Set on the usage event when a different model than the one reserved for answered (provider fallback). */
export type ServedBy = { modelId: string; rates: Rates };

export type StreamProvider = (input: ChatInput, model: string, signal: AbortSignal, request: ProviderRequest) =>
  AsyncIterable<{ text: string } | { usage: Usage; finishReason?: "end_turn" | "max_tokens" | "stop_sequence"; servedBy?: ServedBy }>;

export async function createChatResponse(input: ChatInput, options: {
  ledger: CreditLedger; account: Account; modelId: string; rates: Rates;
  provider: StreamProvider; signal: AbortSignal; maxOutputTokens: number;
  webSearch?: WebSearchProvider;
  session?: PromptSession;
  onComplete?: (text: string) => Promise<void>;
}): Promise<Response> {
  const { ledger, account, modelId, rates } = options;
  const workspaceId = account.workspaceId;
  const hash = createHash("sha256").update(JSON.stringify({ input, modelId, rates, prompt: PROMPT_VERSION, webSearch: Boolean(options.webSearch) })).digest("hex");
  const runtime = runtimeContext({ now: new Date(), session: options.session, webSearch: Boolean(options.webSearch),
    maxOutputTokens: options.maxOutputTokens });
  const inputBound = (Buffer.byteLength(JSON.stringify(input.messages) + ARIA_SYSTEM_PROMPT + runtime, "utf8") +
    (options.webSearch ? MAX_WEB_CONTEXT_BYTES : 0)) * 2 + 2048;
  const units = chargeUnits({ inputTokens: inputBound, outputTokens: options.maxOutputTokens }, rates);
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
      try {
        const results = options.webSearch ? await options.webSearch(searchQuery(input.messages.at(-1)!.content[0].text), signal) : [];
        const { context, sources } = boundedWebContext(results);
        if (options.webSearch && sources.length === 0) throw new WebSearchError("No public web results were found. No credits were charged. Try a different question or turn Web search off.");
        await ledger.markProviderStarted(workspaceId, input.id);
        for await (const event of options.provider(input, modelId, signal, {
          runtimeContext: runtime, webContext: sources.length ? context : undefined, maxOutputTokens: options.maxOutputTokens,
        })) {
          signal.throwIfAborted();
          if ("text" in event) {
            text += event.text;
            if (text.length > 100_000) throw new Error("Output limit exceeded");
            content(JSON.stringify(event.text).slice(1, -1));
          } else { usage = event.usage; finishReason = event.finishReason; servedBy = event.servedBy; }
        }
        signal.throwIfAborted();
        if (!usage || !text.trim()) throw new Error("Response or usage missing");
        if (finishReason === "max_tokens") {
          const notice = "\n\nResponse reached the model's length limit. Ask ARIA to continue if you need the rest.";
          text += notice;
          content(JSON.stringify(notice).slice(1, -1));
        }
        if (sources.length) {
          const links = webSourceLinks(sources);
          text += links;
          content(JSON.stringify(links).slice(1, -1));
        }
      } catch (error) {
        // Incomplete/cancelled responses are not customer-billed; AWS may still bill us.
        await ledger.fail(workspaceId, input.id).catch(() => logLedgerIssue("release_deferred", account, input.id));
        emit(chatFailure(error));
        if (!cancelled) controller.close();
        return;
      }
      const settlement = { charged: chargeUnits(usage, servedBy?.rates ?? rates), inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, response: text };
      if (!await settleWithRetry(ledger, workspaceId, input.id, settlement)) {
        // The answer was delivered; leave the hold for reconciliation rather than releasing it for free.
        logLedgerIssue("settlement_deferred", account, input.id);
      }
      await options.onComplete?.(text).catch(() => logLedgerIssue("thread_save_deferred", account, input.id));
      finish();
      if (!cancelled) controller.close();
    },
    cancel() { cancelled = true; abort.abort(); },
  });
  return new Response(body, { headers: {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    "X-Accel-Buffering": "no",
    "X-Request-Id": input.id,
  } });
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
