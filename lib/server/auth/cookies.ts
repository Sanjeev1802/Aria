import type { SessionTokens } from "./verifier";

/** Session cookies are HttpOnly; the browser cannot read or forge their contents meaningfully. */
export function cookieNames(secure: boolean) {
  return {
    access: secure ? "__Host-aria_at" : "aria_at",
    id: secure ? "__Host-aria_id" : "aria_id",
    // Scoped to the auth API so it is not sent with every request.
    refresh: secure ? "__Secure-aria_rt" : "aria_rt",
  };
}

const SESSION_COOKIE_SECONDS = 30 * 24 * 3600;

function serialize(name: string, value: string, options: { path: string; maxAge: number; secure: boolean }) {
  return [`${name}=${encodeURIComponent(value)}`, `Path=${options.path}`, `Max-Age=${options.maxAge}`,
    "HttpOnly", "SameSite=Lax", ...(options.secure ? ["Secure"] : [])].join("; ");
}

export function readCookies(request: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index < 1) continue;
    try { out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim()); } catch { /* ignore malformed */ }
  }
  return out;
}

export function readSessionTokens(request: Request, secure: boolean): SessionTokens & { refreshToken?: string } {
  const names = cookieNames(secure);
  const jar = readCookies(request);
  return { accessToken: jar[names.access], idToken: jar[names.id], refreshToken: jar[names.refresh] };
}

export function sessionCookies(tokens: { accessToken: string; idToken: string; refreshToken?: string }, secure: boolean) {
  const names = cookieNames(secure);
  const cookies = [
    serialize(names.access, tokens.accessToken, { path: "/", maxAge: SESSION_COOKIE_SECONDS, secure }),
    serialize(names.id, tokens.idToken, { path: "/", maxAge: SESSION_COOKIE_SECONDS, secure }),
  ];
  if (tokens.refreshToken) cookies.push(serialize(names.refresh, tokens.refreshToken, { path: "/api/auth/", maxAge: SESSION_COOKIE_SECONDS, secure }));
  return cookies;
}

export function clearSessionCookies(secure: boolean) {
  const names = cookieNames(secure);
  return [
    serialize(names.access, "", { path: "/", maxAge: 0, secure }),
    serialize(names.id, "", { path: "/", maxAge: 0, secure }),
    serialize(names.refresh, "", { path: "/api/auth/", maxAge: 0, secure }),
  ];
}

export function withCookies(response: Response, cookies: string[]) {
  for (const cookie of cookies) response.headers.append("Set-Cookie", cookie);
  return response;
}
