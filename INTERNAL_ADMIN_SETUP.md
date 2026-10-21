# ARIA Internal dashboard

`/internal/` is a restricted operations dashboard for ARIA staff. It uses the existing Next.js app, shadcn/Tailwind structure, verified customer sessions, DynamoDB account records, and credit ledger. The attached generic project-dashboard component informed the sidebar, metric cards, distribution chart, table, and activity layout; ARIA never displays its sample projects, avatars, or invented metrics.

## Access

- Production: sign in to ARIA, read your verified `user.id` from `/api/auth/session/`, then set `ARIA_ADMIN_SUBS` on the **server** to a comma-separated list of those exact Cognito subject IDs. Restart the server. Customer Team roles and browser-provided values grant no internal access. Use a small, reviewed allowlist; remove a subject and restart to revoke console authorization. Existing sessions can also be revoked with `npm run admin -- revoke-sessions <subject>`.
- Local preview: set both `ARIA_LOCAL_DEV=true` and `ARIA_ADMIN_LOCAL_DEV=true` on a loopback development server. Local Alex can open `/internal/`; local Blair is denied. The flag is ignored in production. Do not turn on the local identity mode in a real customer environment.
- Internal API routes are `/api/admin/overview/`, `/api/admin/customers/:id/`, and `/api/admin/actions/`. Every route re-verifies the session and internal allowlist. Writes require the same-origin check. Responses are `no-store`.
- Every allowlisted subject currently has the same operator authority. Add separate support, billing, and security roles before onboarding a larger internal staff; keep the allowlist small until then.

## Data and controls

The dashboard lists up to 500 indexed customer accounts and workspaces, current-period credit usage, plan distribution, and the most recent 12 audited actions. Opening a customer shows their workspace memberships, seats, and ledger balance. An operator can disable/enable a customer, revoke all their sessions, or change a workspace plan. Each action requires an eight-character reason and an idempotency ID; disabling and session revocation write the change and audit row in one store transaction. Plan changes use the existing entitlement/ledger function, followed by an audit record with the same request ID. A duplicate plan-action retry records an audit row if the entitlement was already applied but the first audit write failed.

Plan downgrades are rejected while occupied seats exceed the destination plan. Credit grants, refunds, payment records, support notes, raw chat content, and API-key controls are **not** part of this console yet. Do not use this screen to represent a payment as completed; manual plan changes are operator actions.

## Existing-account index

New accounts and personal workspaces receive `gsi2` discovery keys automatically. The DynamoDB table definition already includes this index. Before using the dashboard with a pre-existing table, backfill older records:

```sh
ARIA_DYNAMODB_TABLE=your-table AWS_REGION=your-region npm run admin:backfill
ARIA_DYNAMODB_TABLE=your-table AWS_REGION=your-region npm run admin:backfill -- --apply
```

The first command is a dry run and prints counts only. The second scans existing PROFILE and workspace META records and adds missing index keys conditionally. Run it with least-privilege `dynamodb:Scan` and `dynamodb:UpdateItem` permissions; the ARIA app runtime does not need Scan. No customer text, prompts, or secrets are printed.

## Verification

Run `npm test`, `npm run typecheck`, and `npm run build`. In local preview, confirm Alex can open `/internal/`, Blair receives an access error, search finds both users after each has signed in, plan changes update the ledger, duplicate submissions do not charge twice, and the activity list shows the actor and reason. Check the customer table at phone and desktop widths. Before production use, verify the allowlist, account-revocation runbook, DynamoDB backfill, and a real Cognito session in staging.
