import test from "node:test";
import assert from "node:assert/strict";
import { cachePublicSearch, type SearchCache } from "../lib/server/cache/search-cache";
import { createElastiCacheSearchCache } from "../lib/server/cache/elasticache";
import type { WebSearchProvider, WebSource } from "../lib/server/web-search";

const result: WebSource[] = [{ title: "Example", url: "https://example.org/story", snippet: "Public result" }];

test("public search cache reuses only bounded results with an opaque key and short TTL", async () => {
  const entries = new Map<string, string>();
  const writes: { key: string; ttl: number }[] = [];
  const cache: SearchCache = {
    get: async key => entries.get(key) ?? null,
    set: async (key, value, ttl) => { entries.set(key, value); writes.push({ key, ttl }); },
  };
  let calls = 0;
  const search: WebSearchProvider = async () => { calls++; return result; };
  const cached = cachePublicSearch(search, cache);
  const signal = new AbortController().signal;
  assert.deepEqual(await cached("Current public news", signal), result);
  assert.deepEqual(await cached("Current public news", signal), result);
  assert.equal(calls, 1);
  assert.equal(writes[0].ttl, 120);
  assert.doesNotMatch(writes[0].key, /Current public news/i);
});

test("cache outage and invalid entries fall back to live search without hiding search errors", async () => {
  let calls = 0;
  const search: WebSearchProvider = async () => { calls++; return result; };
  const offline: SearchCache = {
    get: async () => { throw new Error("cache offline"); },
    set: async () => { throw new Error("cache offline"); },
  };
  assert.deepEqual(await cachePublicSearch(search, offline)("test", new AbortController().signal), result);
  assert.equal(calls, 1);
  const poisoned: SearchCache = {
    get: async () => JSON.stringify([{ title: "Unsafe", url: "javascript:alert(1)", snippet: "x" }]),
    set: async () => {},
  };
  assert.deepEqual(await cachePublicSearch(search, poisoned)("test", new AbortController().signal), result);
  assert.equal(calls, 2);
  const failingSearch: WebSearchProvider = async () => { throw new Error("live search failed"); };
  await assert.rejects(cachePublicSearch(failingSearch, offline)("test", new AbortController().signal), /live search failed/);
});

test("ElastiCache configuration requires a private TLS connection with credentials", () => {
  assert.throws(() => createElastiCacheSearchCache("redis://localhost:6379"));
  assert.throws(() => createElastiCacheSearchCache("rediss://cache.example:6379"));
  assert.throws(() => createElastiCacheSearchCache("rediss://user:secret@cache.example:6379/1"));
  assert.ok(createElastiCacheSearchCache("rediss://user:secret@cache.example:6379"));
});
