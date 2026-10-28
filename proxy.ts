import { NextResponse, type NextRequest } from "next/server";
import { LOCAL_ACCOUNT_COOKIE } from "@/lib/local-user-shared";

const WORKSPACE = [/^\/chat(\/|$)/, /^\/profile(\/|$)/, /^\/pricing(\/|$)/];

function isWorkspacePath(pathname: string) {
  return WORKSPACE.some((pattern) => pattern.test(pathname));
}

// Mirrors readConfig().localIdentity; the API still verifies every request.
const LOCAL_DEV = process.env.NODE_ENV === "development" && process.env.ARIA_LOCAL_DEV === "true";

function hasAriaSession(request: NextRequest) {
  return Boolean(
    request.cookies.get("aria_at")?.value
    || request.cookies.get("__Host-aria_at")?.value
    || (LOCAL_DEV && request.cookies.get(LOCAL_ACCOUNT_COOKIE)?.value),
  );
}

export function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_ARIA_PREVIEW === "true") return NextResponse.next();
  if (!isWorkspacePath(request.nextUrl.pathname)) return NextResponse.next();
  if (hasAriaSession(request)) return NextResponse.next();

  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const signIn = new URL("/sign-in/", request.url);
  signIn.searchParams.set("next", next);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: ["/chat/:path*", "/profile/:path*", "/pricing/:path*"],
};
