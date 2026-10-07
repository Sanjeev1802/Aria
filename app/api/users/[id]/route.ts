import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { deleteCognitoUser } from "@/lib/auth/cognito-admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  removeUserRecord,
  serializeUser,
  updateUserRoleRecord,
} from "@/lib/db/users";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  let body: { role?: UserRole };
  try {
    body = (await request.json()) as { role?: UserRole };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const role = body.role === "admin" ? "admin" : "user";

  try {
    const user = await updateUserRoleRecord(id, role, auth.user.id);
    return NextResponse.json({ user: serializeUser(user) });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to update this member.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin(_request);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  try {
    const removed = await removeUserRecord(id, auth.user.id);
    await deleteCognitoUser(removed.email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to remove this member.";
    console.error("[users/delete]", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
