import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { serializeUser } from "@/lib/db/users";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  return NextResponse.json({ user: serializeUser(auth.user) });
}
