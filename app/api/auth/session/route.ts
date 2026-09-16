import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-jwt";

export const runtime = "nodejs";

const COOKIE = "aria_id_token";

/** Secure cookies are ignored on plain HTTP (e.g. dev ALB). Use request proto, not NODE_ENV. */
function isSecureRequest(request: Request): boolean {
  const override = process.env.ARIA_COOKIE_SECURE?.trim().toLowerCase();
  if (override === "true") return true;
  if (override === "false") return false;

  for (const header of [
    request.headers.get("cloudfront-forwarded-proto"),
    request.headers.get("x-forwarded-proto"),
  ]) {
    if (!header) continue;
    const proto = header.split(",")[0]?.trim().toLowerCase();
    if (proto === "https") return true;
    if (proto === "http") return false;
  }

  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

function cookieOptions(request: Request, maxAge: number) {
  const secure = isSecureRequest(request);
  return [
    `${COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
    `Max-Age=${maxAge}`,
  ]
    .filter(Boolean)
    .join("; ");
}

export async function POST(request: Request) {
  let body: { idToken?: string };
  try {
    body = (await request.json()) as { idToken?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const idToken = body.idToken?.trim();
  if (!idToken) {
    return NextResponse.json({ error: "idToken is required" }, { status: 400 });
  }

  try {
    await verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.headers.set(
    "Set-Cookie",
    cookieOptions(request, 3600).replace(
      `${COOKIE}=`,
      `${COOKIE}=${encodeURIComponent(idToken)}`,
    ),
  );
  return response;
}

export async function DELETE(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.headers.set(
    "Set-Cookie",
    cookieOptions(request, 0).replace(`${COOKIE}=`, `${COOKIE}=`),
  );
  return response;
}
