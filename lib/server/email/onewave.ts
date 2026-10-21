export type TeamInviteEmail = {
  to: string;
  inviteeName: string;
  inviteLink: string;
  inviteId: string;
};

export type TeamInviteSender = (input: TeamInviteEmail) => Promise<void>;

/** OneWave's aria-team-invitation template contract, shared with aria-api-changes. */
export function createOneWaveInviteSender(baseUrl: string, apiKey: string, fetcher: typeof fetch = fetch): TeamInviteSender {
  const endpoint = new URL("/api/emails", baseUrl);
  if (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && ["localhost", "127.0.0.1"].includes(endpoint.hostname))) {
    throw new Error("EMAIL_SERVICE_URL must use HTTPS (or loopback HTTP for development)");
  }
  if (!apiKey.trim()) throw new Error("EMAIL_SERVICE_API_KEY is required");
  return async input => {
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "Idempotency-Key": `aria-team-invite-${input.inviteId}`,
      },
      body: JSON.stringify({
        templateId: "aria-team-invitation",
        to: input.to,
        variables: { name: input.inviteeName, expiry_days: "7", invite_link: input.inviteLink },
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`OneWave returned HTTP ${response.status}`);
    const body = await response.json() as { success?: boolean };
    if (body.success !== true) throw new Error("OneWave did not confirm delivery");
  };
}
