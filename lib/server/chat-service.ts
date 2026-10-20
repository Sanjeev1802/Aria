import { createHash, randomUUID } from "node:crypto";
import type { ChatInput } from "./chat-input";
import { ARIA_SYSTEM_PROMPT, PROMPT_VERSION } from "./system-prompt";
import { chargeUnits, type Rates, type Usage } from "./metering";
import { ServiceError } from "./errors";
import type { Account, CreditLedger } from "./accounting/credit-ledger";

export type StreamProvider = (input: ChatInput, model: string, signal: AbortSignal) =>
  AsyncIterable<{ text: string } | { usage: Usage }>;

export async function createChatResponse(input: ChatInput, options: {
  ledger: CreditLedger; account: Account; modelId: string; rates: Rates;
  provider: StreamProvider; signal: AbortSignal; maxOutputTokens: number;
  onComplete?: (text: string) => Promise<void>;
}): Promise<Response> {
  const { ledger, account, modelId, rates } = options;
  const workspaceId = account.workspaceId;
  const hash = createHash("sha256").update(JSON.stringify({ input, modelId, rates, prompt: PROMPT_VERSION })).digest("hex");
  const inputBound = Buffer.byteLength(JSON.stringify(input.messages) + ARIA_SYSTEM_PROMPT, "utf8") * 2 + 2048;
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
      try {
        await ledger.markProviderStarted(workspaceId, input.id);
        for await (const event of options.provider(input, modelId, signal)) {
          signal.throwIfAborted();
          if ("text" in event) {
            text += event.text;
            if (text.length > 100_000) throw new Error("Output limit exceeded");
            content(JSON.stringify(event.text).slice(1, -1));
          } else usage = event.usage;
        }
        signal.throwIfAborted();
        if (!usage || !text.trim()) throw new Error("Response or usage missing");
      } catch {
        // Incomplete/cancelled responses are not customer-billed; AWS may still bill us.
        await ledger.fail(workspaceId, input.id).catch(() => logLedgerIssue("release_deferred", account, input.id));
        emit({ type: "RUN_ERROR", code: "response_failed", message: "ARIA could not finish this response. No credits were charged for an incomplete response. Try again." });
        if (!cancelled) controller.close();
        return;
      }
      const settlement = { charged: chargeUnits(usage, rates), inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, response: text };
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
