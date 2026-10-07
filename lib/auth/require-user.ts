import { NextResponse } from "next/server";
import {
  assertDatabaseConfigured,
  isDatabaseConfigError,
  isDatabaseConnectionError,
} from "@/lib/db/config";
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
    assertDatabaseConfigured();
    const payload = await verifyIdToken(token);
    const user = await upsertUserFromToken(payload);
    return { user, payload, token };
  } catch (error) {
    if (isDatabaseConfigError(error)) {
      console.error("[auth] database not configured", error);
      return {
        error: NextResponse.json(
          {
            error:
              "Database is not configured. Set DATABASE_URL in .env.local, or run ./scripts/sync-aria-dev-env.sh after AWS login.",
          },
          { status: 503 },
        ),
      };
    }
    if (isDatabaseConnectionError(error)) {
      console.error("[auth] database unreachable", error);
      return {
        error: NextResponse.json(
          {
            error:
              "Unable to reach the database. If you're developing locally against Aurora, confirm AWS VPN/network access and restart npm run dev.",
          },
          { status: 503 },
        ),
      };
    }
    console.error("[auth]", error);
    return {
      error: NextResponse.json(
        { error: "Session expired. Please sign in again." },
        { status: 401 },
      ),
    };
  }
}
