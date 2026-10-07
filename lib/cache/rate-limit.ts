import { NextResponse } from "next/server";
import { getRedis } from "./redis";

const INCR_WITH_TTL = `
local current = redis.call("INCR", KEYS[1])
if current == 1 or redis.call("TTL", KEYS[1]) < 0 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return current
`;

export type RateLimitInput = {
  scope: string;
  identity: string;
  limit: number;
  windowSec: number;
};

function clientAddress(request: Request) {
  const viewer = request.headers.get("cloudfront-viewer-address");
  if (viewer) return viewer.replace(/:\d+$/, "");

  const forwarded = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const viaCloudFront =
    (request.headers.get("via") ?? "").toLowerCase().includes("cloudfront") ||
    Boolean(request.headers.get("x-amz-cf-id"));

  if (viaCloudFront && forwarded.length >= 2) {
    return forwarded[forwarded.length - 2];
  }
  if (forwarded.length > 0) return forwarded[forwarded.length - 1];
  return "unknown";
}

export function clientRateLimitIdentity(request: Request) {
  return clientAddress(request);
}

export async function enforceRateLimit(
  input: RateLimitInput,
): Promise<NextResponse | null> {
  const redis = getRedis();
  if (!redis) return null;

  const key = `aria:rl:${input.scope}:${input.identity}`;
  try {
    const count = Number(
      await redis.eval(INCR_WITH_TTL, 1, key, String(input.windowSec)),
    );
    if (!Number.isFinite(count) || count <= input.limit) return null;

    const ttl = await redis.ttl(key);
    const retryAfter = ttl > 0 ? ttl : input.windowSec;
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    );
  } catch (error) {
    console.error("[rate-limit]", error);
    return null;
  }
}
