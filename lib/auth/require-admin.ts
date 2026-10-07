import { NextResponse } from "next/server";
import { requireUser } from "./require-user";

export async function requireAdmin(request: Request) {
  const auth = await requireUser(request);
  if (auth.error) return auth;

  if (auth.user.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Only admins can perform this action." },
        { status: 403 },
      ),
    };
  }

  return auth;
}
