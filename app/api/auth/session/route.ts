import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-jwt";

export const runtime = "nodejs";

const COOKIE = "aria_id_token";

function cookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  return [
    `${COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
    "Max-Age=3600",
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
    cookieOptions().replace(`${COOKIE}=`, `${COOKIE}=${encodeURIComponent(idToken)}`),
  );
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.headers.set(
    "Set-Cookie",
    [
      `${COOKIE}=`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=0",
    ].join("; "),
  );
  return response;
}
