import { NextResponse } from "next/server";
import { activateInvitedUser } from "@/lib/auth/cognito-admin";
import { verifyInviteToken } from "@/lib/auth/invite-token";
import { activateInvitedUserRecord } from "@/lib/db/users";

export const runtime = "nodejs";

type AcceptInviteBody = {
  token?: string;
  password?: string;
};

function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
}

export async function POST(request: Request) {
  let body: AcceptInviteBody;
  try {
    body = (await request.json()) as AcceptInviteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = String(body.token ?? "").trim();
  const password = String(body.password ?? "");

  if (!token) {
    return NextResponse.json(
      { error: "This invitation link is invalid." },
      { status: 400 },
    );
  }

  const invite = verifyInviteToken(token);
  if (!invite) {
    return NextResponse.json(
      { error: "This invitation link is invalid or has expired." },
      { status: 400 },
    );
  }

  if (!isStrongPassword(password)) {
    return NextResponse.json(
      {
        error:
          "Password must be at least 8 characters and include upper, lower, and a number.",
      },
      { status: 400 },
    );
  }

  try {
    const { cognitoSub } = await activateInvitedUser(
      invite.email,
      invite.name,
      password,
    );
    await activateInvitedUserRecord(invite.email, cognitoSub);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Unable to activate your invitation.";
    console.error("[accept-invite]", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, email: invite.email });
}
