import type { ServedBy, StreamProvider } from "./chat-service";
import type { Rates } from "./metering";

type Backup = { provider: StreamProvider; config: () => { id: string; rates: Rates } };

/**
 * Streams from `primary`, switching to `backup` only when the primary fails
 * before producing any text (outage, rate limit, auth or config error). Once
 * text has reached the user, a failure is surfaced rather than spliced.
 */
export function withFallback(primary: StreamProvider, backup: Backup): StreamProvider {
  return async function* (input, modelId, signal, request) {
    let started = false;
    try {
      for await (const event of primary(input, modelId, signal, request)) {
        if ("text" in event) started = true;
        yield event;
      }
      return;
    } catch (error) {
      if (started || signal.aborted) throw error;
      const name = error instanceof Error ? error.name : "unknown";
      const status = (error as { status?: unknown } | null)?.status;
      console.warn(JSON.stringify({ level: "warn", event: "provider_fallback", from: modelId, error: name, status }));
    }
    const config = backup.config();
    const servedBy: ServedBy = { modelId: config.id, rates: config.rates };
    // The backup model cannot search; say so instead of letting it imply it did.
    const backupRequest = request.webSearchTool
      ? { ...request, webSearchTool: undefined,
        runtimeContext: `${request.runtimeContext}\n- Web search failed for this message: answer without it and say live results could not be checked.` }
      : request;
    for await (const event of backup.provider(input, config.id, signal, backupRequest)) {
      yield "usage" in event ? { ...event, servedBy } : event;
    }
  };
}
