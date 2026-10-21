import { createCluster } from "redis";
import type { SearchCache } from "./search-cache";

const RETRY_AFTER_FAILURE_MS = 15_000;
type ClusterClient = ReturnType<typeof createCluster>;

/** A TLS Redis Cluster connection for ElastiCache Serverless (Valkey/Redis OSS). */
export function createElastiCacheSearchCache(connectionUrl: string): SearchCache {
  let endpoint: URL;
  try {
    endpoint = new URL(connectionUrl);
    if (endpoint.protocol !== "rediss:" || !endpoint.hostname || !endpoint.username || !endpoint.password ||
      (endpoint.pathname !== "/" && endpoint.pathname !== "") || endpoint.search || endpoint.hash) throw new Error();
  } catch { throw new Error("ARIA_ELASTICACHE_URL must be a rediss:// username/password URL without a path or query"); }

  const username = decodeURIComponent(endpoint.username);
  const password = decodeURIComponent(endpoint.password);
  let active: Promise<ClusterClient> | undefined;
  let retryAfter = 0;

  async function client() {
    if (Date.now() < retryAfter) throw new Error("ElastiCache temporarily unavailable");
    if (!active) {
      active = (async () => {
        const cluster = createCluster({
          rootNodes: [{ url: connectionUrl }],
          // Redis Cluster does not copy TLS or credentials from rootNodes to discovered nodes.
          defaults: { username, password, socket: { tls: true, connectTimeout: 1_000, reconnectStrategy: false } },
          minimizeConnections: true,
        });
        cluster.on("error", () => { /* Search falls back to SearXNG on command failure. */ });
        try { await cluster.connect(); return cluster; }
        catch (error) { cluster.destroy(); throw error; }
      })();
    }
    const pending = active;
    if (!pending) throw new Error("ElastiCache connection unavailable");
    try { return await pending; }
    catch (error) { active = undefined; retryAfter = Date.now() + RETRY_AFTER_FAILURE_MS; throw error; }
  }

  async function run<T>(command: (cluster: ClusterClient) => Promise<T>): Promise<T> {
    const cluster = await client();
    try { return await command(cluster); }
    catch (error) {
      cluster.destroy();
      active = undefined;
      retryAfter = Date.now() + RETRY_AFTER_FAILURE_MS;
      throw error;
    }
  }

  return {
    get: key => run(cluster => cluster.get(key)),
    set: async (key, value, ttlSeconds) => { await run(cluster => cluster.setEx(key, ttlSeconds, value)); },
  };
}

let shared: { url: string; cache: SearchCache } | undefined;

export function getElastiCacheSearchCache(connectionUrl: string): SearchCache {
  if (!shared || shared.url !== connectionUrl) shared = { url: connectionUrl, cache: createElastiCacheSearchCache(connectionUrl) };
  return shared.cache;
}
