const TEAM_INVITE_TEMPLATE_ID = "aria-team-invitation";
const DEFAULT_INVITE_EXPIRY_DAYS = 7;

export type SendTeamInviteEmailInput = {
  to: string;
  inviteeName: string;
  inviteLink: string;
  expiryDays?: number;
  idempotencyKey?: string;
};

export type SendTeamInviteEmailResult =
  | { ok: true; emailId?: string }
  | { ok: false; error: string; status?: number };

type EmailServiceConfig =
  | { ok: true; apiKey: string; baseUrl: string }
  | { ok: false; error: string };

function getEmailServiceConfig(): EmailServiceConfig {
  const apiKey = process.env.EMAIL_SERVICE_API_KEY?.trim();
  const baseUrl = process.env.EMAIL_SERVICE_URL?.trim()?.replace(/\/$/, "");

  if (!apiKey) {
    return {
      ok: false,
      error: "Email service is not configured (EMAIL_SERVICE_API_KEY).",
    };
  }
  if (!baseUrl) {
    return {
      ok: false,
      error: "Email service is not configured (EMAIL_SERVICE_URL).",
    };
  }

  return { ok: true, apiKey, baseUrl };
}

export function buildTeamInviteLink(token: string): string {
  const base =
    process.env.ARIA_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_WEB_URL?.trim() ||
    "http://localhost:3000";
  const origin = base.replace(/\/$/, "");
  const params = new URLSearchParams({ token });
  return `${origin}/create-password?${params.toString()}`;
}

export async function sendTeamInviteEmail(
  input: SendTeamInviteEmailInput,
): Promise<SendTeamInviteEmailResult> {
  const config = getEmailServiceConfig();
  if (!config.ok) {
    return { ok: false, error: config.error };
  }

  const to = input.to.trim().toLowerCase();
  const expiryDays = input.expiryDays ?? DEFAULT_INVITE_EXPIRY_DAYS;
  const idempotencyKey =
    input.idempotencyKey?.trim() ||
    `aria-team-invite-${to}-${Date.now().toString(36)}`;

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/api/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        templateId: TEAM_INVITE_TEMPLATE_ID,
        to,
        variables: {
          name: input.inviteeName.trim(),
          expiry_days: String(expiryDays),
          invite_link: input.inviteLink,
        },
      }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[email] request failed", err);
    return { ok: false, error: "Could not reach the email service." };
  }

  const rawText = await response.text();
  let body: {
    success?: boolean;
    message?: string;
    emailId?: string;
    errorCode?: string;
  } = {};
  try {
    body = JSON.parse(rawText) as typeof body;
  } catch {
    body = {};
  }

  if (!response.ok || !body.success) {
    if (
      response.status === 403 &&
      (/localhost|127\.0\.0\.1/i.test(input.inviteLink) ||
        rawText.includes("403 Forbidden"))
    ) {
      return {
        ok: false,
        error:
          "The email service blocked this request because the invite link uses localhost. Set ARIA_PUBLIC_URL in .env.local to a public HTTPS URL (for example your dev or staging ARIA domain), restart the app, and try again.",
        status: 403,
      };
    }

    const message =
      body.message ||
      body.errorCode ||
      `Email service returned ${response.status}.`;
    return { ok: false, error: message, status: response.status };
  }

  return { ok: true, emailId: body.emailId };
}
