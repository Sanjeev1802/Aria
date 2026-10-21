# Team invitation email

`Aria-new-setup` uses the OneWave template contract from `aria-api-changes` for Team invitation delivery. It retains this branch's server-owned workspace, invitation token, seven-day expiry, verified-email acceptance, and seat accounting. It does not use the other branch's Prisma user or invite-token implementation.

Set these variables in the ARIA server environment:

```env
ARIA_APP_ORIGIN=https://your-aria-domain.example
EMAIL_SERVICE_URL=https://your-onewave-endpoint.example
EMAIL_SERVICE_API_KEY=your-server-only-key
```

The email service must have a template named `aria-team-invitation` that accepts `name`, `expiry_days`, and `invite_link`. ARIA sends `POST /api/emails` with the API key in `x-api-key` and a stable `Idempotency-Key` based on the invitation ID. The service must return a successful HTTP status and JSON `{ "success": true }`. Use the endpoint assigned to your environment; the dev endpoint in `aria-api-changes` is `https://dev.send.onewave.live`.

The invite link uses `ARIA_APP_ORIGIN` and `/invite/?token=...`. The email service may reject loopback links, so use a reachable HTTPS origin when testing real delivery. Never put `EMAIL_SERVICE_API_KEY` in a `NEXT_PUBLIC_*` variable or browser storage.

When email is configured, the Team panel confirms that the invitation was emailed; the API does not return the token to the browser. A send failure revokes the invitation and releases the seat. The admin can try again. When email is not configured, the panel retains the existing one-time link flow so local development remains usable. The recipient still needs an ARIA account with the invited address verified before accepting.

The automated tests use a mock email service. Real template delivery, domain allowlisting, link opening, and the complete Cognito journey still need a staging check before launch.
