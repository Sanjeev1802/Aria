import { createHash } from "node:crypto";
import { normalizeWebSources, searchQuery, type WebSearchProvider, type WebSource } from "../web-search";

export type SearchCache = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
};

const TTL_SECONDS = 120;
const CACHE_TIMEOUT_MS = 200;

function keyFor(query: string) {
  return `aria:public-search:v1:${createHash("sha256").update(query.trim().toLowerCase()).digest("hex")}`;
}

async function briefly<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("cache timeout")), CACHE_TIMEOUT_MS); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Optional cache for public search results only. The live search remains authoritative. */
export function cachePublicSearch(search: WebSearchProvider, cache: SearchCache): WebSearchProvider {
  return async (query, signal): Promise<WebSource[]> => {
    signal.throwIfAborted();
    const safeQuery = searchQuery(query);
    const key = keyFor(safeQuery);
    try {
      const hit = await briefly(cache.get(key));
      if (hit && Buffer.byteLength(hit, "utf8") <= 8_000) {
        const parsed: unknown = JSON.parse(hit);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sources = normalizeWebSources({ results: parsed.map(item => ({
            title: item?.title, url: item?.url, content: item?.snippet,
          })) });
          if (sources.length === parsed.length) {
            signal.throwIfAborted();
            return sources;
          }
        }
      }
    } catch {
      // Cache misses, invalid entries, and outages must not block live search.
    }
    signal.throwIfAborted();
    const sources = await search(safeQuery, signal);
    if (sources.length && !signal.aborted) {
      try { await briefly(cache.set(key, JSON.stringify(sources), TTL_SECONDS)); }
      catch { /* Cache writes are best effort. */ }
    }
    return sources;
  };
}
