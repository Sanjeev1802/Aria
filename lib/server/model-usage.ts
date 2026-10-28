import type { Store } from "./store/types";

/** Who answered a chat request. `bedrock` is Amazon Nova through Amazon Bedrock. */
export type ModelProvider = "claude" | "bedrock" | "local";

const key = (day: string) => ({ pk: "ADMIN#MODEL_USAGE", sk: `DAY#${day}` });
const dayOf = (at: number) => new Date(at).toISOString().slice(0, 10);

export function providerOf(modelId: string): ModelProvider {
  if (modelId.startsWith("aria/local")) return "local";
  if (/^claude/i.test(modelId)) return "claude";
  return "bedrock";
}

export type ModelUseEntry = {
  /** The model that produced (or was meant to produce) the answer. */
  modelId: string;
  /** True when the backup model answered because the primary failed before streaming. */
  fallback: boolean;
  /** False when the request failed and the customer was not charged. */
  ok: boolean;
};

/** One counter row per UTC day, plus the most recent outcome, so the console can show what is serving now. */
export async function recordModelUse(store: Store, entry: ModelUseEntry, now = Date.now()) {
  const provider = providerOf(entry.modelId);
  const add: Record<string, number> = entry.ok ? { [provider]: 1 } : { failed: 1 };
  if (entry.ok && entry.fallback) add.fallback = 1;
  await store.transact([{ kind: "update", key: key(dayOf(now)), add, set: {
    lastProvider: provider, lastModelId: entry.modelId, lastAt: now, lastOk: entry.ok, lastFallback: entry.fallback,
    ...(entry.ok && entry.fallback ? { lastFallbackAt: now } : {}),
    ...(entry.ok ? {} : { lastFailedAt: now }),
  } }]);
}

export type ModelDay = { date: string; claude: number; bedrock: number; local: number; fallback: number; failed: number };
export type LastModelUse = { provider: ModelProvider; modelId: string; at: number; ok: boolean; fallback: boolean };

export async function readModelUsage(store: Store, days = 7, now = Date.now()) {
  const dates = Array.from({ length: days }, (_, i) => dayOf(now - (days - 1 - i) * 86_400_000));
  const rows = new Map((await store.query("ADMIN#MODEL_USAGE", "DAY#", { limit: 400 }))
    .map(row => [String(row.sk).slice(4), row]));
  const series: ModelDay[] = dates.map(date => {
    const row = rows.get(date);
    const n = (field: string) => Number(row?.[field] ?? 0);
    return { date, claude: n("claude"), bedrock: n("bedrock"), local: n("local"), fallback: n("fallback"), failed: n("failed") };
  });
  const sum = (field: keyof Omit<ModelDay, "date">) => series.reduce((total, day) => total + day[field], 0);
  let last: LastModelUse | undefined;
  for (const row of rows.values()) {
    const at = Number(row.lastAt ?? 0);
    if (at && (!last || at > last.at)) {
      last = { provider: row.lastProvider as ModelProvider, modelId: String(row.lastModelId), at,
        ok: row.lastOk === true, fallback: row.lastFallback === true };
    }
  }
  return {
    series, last,
    totals: { claude: sum("claude"), bedrock: sum("bedrock"), local: sum("local"), fallback: sum("fallback"), failed: sum("failed") },
  };
}
