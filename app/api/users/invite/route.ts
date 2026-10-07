import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { createInviteToken } from "@/lib/auth/invite-token";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db/prisma";
import { createInvitedUser } from "@/lib/db/users";
import {
  buildTeamInviteLink,
  sendTeamInviteEmail,
} from "@/lib/email/onewave";

export const runtime = "nodejs";

type InviteBody = {
  email?: string;
  name?: string;
  role?: UserRole;
};

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  let body: InviteBody;
  try {
    body = (await request.json()) as InviteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const name = String(body.name ?? "").trim();
  const role = body.role === "admin" ? "admin" : "user";

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }
  if (!name) {
    return NextResponse.json(
      { error: "Enter a display name." },
      { status: 400 },
    );
  }

  try {
    await createInvitedUser({ email, fullName: name, role });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to create the invitation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let inviteToken: string;
  try {
    inviteToken = createInviteToken({ email, name });
  } catch (err) {
    console.error("[invite]", err);
    return NextResponse.json(
      {
        error:
          "Invite signing is not configured. Set INVITE_TOKEN_SECRET or ARIA_EMBED_SECRET.",
      },
      { status: 500 },
    );
  }

  const inviteLink = buildTeamInviteLink(inviteToken);

  const sent = await sendTeamInviteEmail({
    to: email,
    inviteeName: name,
    inviteLink,
    idempotencyKey: `aria-invite-${email}-${auth.user.id}`,
  });

  if (!sent.ok) {
    console.error("[invite]", sent.error);
    await prisma.user.deleteMany({
      where: { email, status: "invited" },
    });
    return NextResponse.json(
      { error: sent.error || "Failed to send invitation email." },
      { status: sent.status && sent.status >= 400 ? sent.status : 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    email,
    inviteLink,
    emailId: sent.emailId,
  });
}
