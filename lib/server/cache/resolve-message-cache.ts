import { dirname, join } from "node:path";
import type { ServerConfig } from "../services";
import { createDevFileMessageCache } from "./dev-file-cache";
import { getElastiCache } from "./elasticache";
import type { SearchCache } from "./search-cache";

let devCache: { path: string; cache: SearchCache } | undefined;

/** ElastiCache in AWS; same key semantics on a dev file cache when running on localhost. */
export function resolveMessageCache(config: ServerConfig): SearchCache | undefined {
  if (config.elasticacheUrl) {
    try {
      return getElastiCache(config.elasticacheUrl);
    } catch {
      console.warn("ARIA ElastiCache URL is invalid; trying local file cache if development");
    }
  }
  if (config.environment !== "development") return undefined;
  const path = join(config.localStorePath ? dirname(config.localStorePath) : join(process.cwd(), ".aria"),
    "message-response-cache.json");
  if (!devCache || devCache.path !== path) {
    devCache = { path, cache: createDevFileMessageCache(path) };
  }
  return devCache.cache;
}
