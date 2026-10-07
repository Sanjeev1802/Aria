import Redis from "ioredis";

type RedisSlot = {
  client?: Redis;
  key?: string;
};

const globalCache = globalThis as typeof globalThis & {
  __ariaRedis?: RedisSlot;
};

function redisConfig() {
  const host = process.env.REDIS_HOST?.trim();
  const authToken = process.env.REDIS_AUTH_TOKEN?.trim();
  if (!host || !authToken) return null;
  const port = Number(process.env.REDIS_PORT || 6379);
  return { host, port, authToken, key: `${host}:${port}` };
}

/** Shared ElastiCache client. Returns null when Redis is not configured. */
export function getRedis(): Redis | null {
  const config = redisConfig();
  if (!config) return null;

  const slot = (globalCache.__ariaRedis ??= {});
  if (slot.client && slot.key === config.key) return slot.client;

  const client = new Redis({
    host: config.host,
    port: config.port,
    password: config.authToken,
    tls: {},
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 1500,
    enableOfflineQueue: false,
  });
  client.on("error", (error: Error) => {
    console.error("[cache]", error.message);
  });
  slot.client = client;
  slot.key = config.key;
  return client;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(`aria:${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error("[cache] read failed", error);
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSec: number) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(`aria:${key}`, JSON.stringify(value), "EX", ttlSec);
  } catch (error) {
    console.error("[cache] write failed", error);
  }
}

export async function cacheDel(key: string) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(`aria:${key}`);
  } catch (error) {
    console.error("[cache] delete failed", error);
  }
}
