import test from "node:test";
import assert from "node:assert/strict";
import { createOneWaveInviteSender } from "../lib/server/email/onewave";

test("OneWave sender posts the Team template with a stable invite ID and server-only key", async () => {
  let url = "";
  let init: RequestInit | undefined;
  const sender = createOneWaveInviteSender("https://dev.send.onewave.live", "test-secret", async (input, options) => {
    url = String(input);
    init = options;
    return Response.json({ success: true, emailId: "mail_1" });
  });
  await sender({ to: "casey@example.com", inviteeName: "Casey", inviteLink: "https://aria.test/invite/?token=abc", inviteId: "invite_1" });
  assert.equal(url, "https://dev.send.onewave.live/api/emails");
  assert.equal((init?.headers as Record<string, string>)["x-api-key"], "test-secret");
  assert.equal((init?.headers as Record<string, string>)["Idempotency-Key"], "aria-team-invite-invite_1");
  assert.deepEqual(JSON.parse(String(init?.body)), {
    templateId: "aria-team-invitation", to: "casey@example.com",
    variables: { name: "Casey", expiry_days: "7", invite_link: "https://aria.test/invite/?token=abc" },
  });
});

test("OneWave sender rejects unconfirmed delivery", async () => {
  const sender = createOneWaveInviteSender("https://dev.send.onewave.live", "test-secret", async () =>
    Response.json({ success: false }, { status: 200 }));
  await assert.rejects(sender({ to: "casey@example.com", inviteeName: "Casey", inviteLink: "https://aria.test/invite/", inviteId: "invite_2" }));
  assert.throws(() => createOneWaveInviteSender("http://public.example", "test-secret"));
});
