import { NextResponse } from "next/server";
import { upsertUserFromToken } from "@/lib/db/users";
import { readRequestToken, verifyIdToken } from "./verify-jwt";

export async function requireUser(request: Request) {
  const token = readRequestToken(request);
  if (!token) {
    return {
      error: NextResponse.json({ error: "Sign in required." }, { status: 401 }),
    };
  }

  try {
    const payload = await verifyIdToken(token);
    const user = await upsertUserFromToken(payload);
    return { user, payload, token };
  } catch (error) {
    console.error("[auth]", error);
    return {
      error: NextResponse.json(
        { error: "Session expired. Please sign in again." },
        { status: 401 },
      ),
    };
  }
}
