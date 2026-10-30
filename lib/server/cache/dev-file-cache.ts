import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { SearchCache } from "./search-cache";

type Entry = { value: string; expiresAt: number };

/** Local stand-in for ElastiCache when `ARIA_ELASTICACHE_URL` is unset (localhost cannot reach VPC Valkey). */
export function createDevFileMessageCache(filePath: string): SearchCache {
  let entries: Record<string, Entry> = {};
  let loaded = false;
  let persist: Promise<void> | undefined;

  async function load() {
    if (loaded) return;
    loaded = true;
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        entries = parsed as Record<string, Entry>;
      }
    } catch {
      entries = {};
    }
  }

  async function flush() {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(entries), "utf8");
  }

  function schedulePersist() {
    persist ??= flush().finally(() => { persist = undefined; });
  }

  return {
    get: async key => {
      await load();
      const row = entries[key];
      if (!row) return null;
      if (row.expiresAt <= Date.now()) {
        delete entries[key];
        schedulePersist();
        return null;
      }
      return row.value;
    },
    set: async (key, value, ttlSeconds) => {
      await load();
      entries[key] = { value, expiresAt: Date.now() + ttlSeconds * 1000 };
      schedulePersist();
    },
  };
}
