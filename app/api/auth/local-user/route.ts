import { LOCAL_USER_COOKIE } from "@/lib/local-user-shared";
import { isLocalUserSlot } from "@/lib/server/local-dev";
import { readJson, run } from "@/lib/server/handlers";
import { ServiceError } from "@/lib/server/errors";
import { assertSameOrigin } from "@/lib/server/request-context";
import type { Services } from "@/lib/server/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handler(request: Request, s: Services) {
  if (!s.config.localIdentity || s.config.environment !== "development") throw new ServiceError("permission_denied", 403);
  assertSameOrigin(request, s);
  const body = await readJson(request);
  if (!isLocalUserSlot(typeof body.user === "string" ? body.user : undefined)) throw new ServiceError("invalid_auth_request", 400);
  const response = Response.json({ ok: true, user: body.user });
  response.headers.append("Set-Cookie", `${LOCAL_USER_COOKIE}=${body.user}; Path=/; SameSite=Lax; Max-Age=2592000`);
  return response;
}

export function POST(request: Request) {
  return run(request, handler);
}
