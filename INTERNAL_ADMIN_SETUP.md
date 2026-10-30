# ARIA Internal dashboard

See the [ARIA Internal PRD](docs/internal/prd.md) for product scope, acceptance criteria, and the delivery roadmap.

`/internal/sign-in/` is the dedicated operator entry page. It uses ARIA's existing sign-in endpoint and verifies access against the internal overview API before opening `/internal/`; an ordinary signed-in ARIA user cannot enter the console. `/internal/` is a restricted operations dashboard for ARIA staff. Its shadcn-based layout has a collapsible sidebar, a top bar that stays visible while scrolling, live account and credit summaries, a plan chart, an audit panel, and searchable data tables. The graphite theme uses one ARIA green signal color and restrained chart accents. No example revenue, projects, or sample customers are shown. The sidebar footer shows the verified operator's name, internal role, and email.

## Access

- Production: sign in to ARIA, read your verified `user.id` from `/api/auth/session/`, then set `ARIA_ADMIN_SUBS` on the **server** to a comma-separated list of those exact Cognito subject IDs. Restart the server. Operators can then use `/internal/sign-in/`. Customer Team roles and browser-provided values grant no internal access. Use a small, reviewed allowlist; remove a subject and restart to revoke console authorization. Existing sessions can also be revoked with `npm run admin -- revoke-sessions <subject>`.
- Local preview: set both `ARIA_LOCAL_DEV=true` and `ARIA_ADMIN_LOCAL_DEV=true` on a loopback development server. Local Alex can open `/internal/`; local Blair is denied. A Cognito sign-in is granted in this mode when its verified email already belongs to an allowlisted operator. The flag is ignored in production. Do not turn on the local identity mode in a real customer environment.
- Internal API routes are `/api/admin/overview/`, `/api/admin/customers/:id/`, and `/api/admin/actions/`. Every route re-verifies the session and internal allowlist. Writes require the same-origin check. Responses are `no-store`.
- Two more routes serve the console: `/api/admin/usage/?days=7|30|90` (any operator) returns workspace usage from the ledger, and `/api/admin/operators/` (super admin only; `GET`, `PUT`, `DELETE`) manages delegated operators. `/api/admin/models/` (any operator) reports which model is answering chat: the configured primary and fallback, and what actually served the last requests.
- ARIA Team: a super admin opens **ARIA Team** in the sidebar and adds people by email as `admin`, `member`, `billing` or `operations` (`support` is the older name for a view-only member). An `admin` is view-only until a super admin turns on **Can change anything**; with it on, the admin can use every action and edit subscription plans, but still cannot manage the team. Grants are stored in the ledger table, audited, and apply once that email is verified, so no redeploy or `ARIA_ADMIN_ROLES` change is needed. `super_admin` itself can only be set on the server.
- `ARIA_ADMIN_SUBS` grants super-admin authority. For scoped staff, set `ARIA_ADMIN_ROLES` to comma-separated `subject:role` pairs. `support` can inspect records only; `billing` can inspect records, change plans, and grant small credit adjustments; `operations` can inspect records, disable or enable accounts, and revoke sessions. A subject in both settings is a super admin. The server enforces these permissions; hiding a control in the browser is only a usability aid. Restart after role changes.

## Data and controls

The console has Overview, Customers, Workspaces, Plans & credits, Audit activity, and Operations views. It lists up to 500 indexed customer accounts and workspaces, current-period credit usage and balances, plan distribution, and the most recent 12 audited actions. These are bounded views, not full reporting exports; the screen warns when it reaches the 500-record cap. Customers can be searched and filtered by account status; workspaces can be searched by name, ID, or owner and filtered by plan. Refresh shows its progress and last successful time. Opening a customer shows their workspace memberships, seats, and ledger balance. An operator can disable/enable a customer, revoke all their sessions, change a workspace plan, or grant up to 100 credits per action to another person's workspace. Each action requires an eight-character reason and an idempotency ID. A failed action reports its error inside the confirmation dialog without claiming success. Credit grants, account status changes, and session revocation write the change and audit row in one store transaction. Plan changes use the existing entitlement/ledger function, followed by an audit record with the same request ID. A duplicate plan-action retry records an audit row if the entitlement was already applied but the first audit write failed.

The Overview also charts live usage (requests, tokens, credits and active users, with top users and usage by plan) from the ledger's per-day activity rows. Request counts and credits are recorded from the day tracking was added; earlier days show tokens only. The Overview also has an **AI model** section, and the top bar shows a live chip such as "Claude · Haiku 5.5". It shows whether Claude, Amazon Bedrock (Nova) or the local test model is serving, whether the Bedrock fallback is ready, whether live web search is on, and how the last seven days split between providers. Each completed or failed chat request is counted per UTC day (`ADMIN#MODEL_USAGE` rows); a request answered by the fallback shows as "Fallback active". Operators see an **Internal dashboard** entry in the workspace user menu, and changes made here (plan, credits, AI access) reach an open workspace within about 15 seconds.

Plan downgrades are rejected while occupied seats exceed the destination plan. The Operations view gives the reconciliation command and configuration reminders; it is not a live infrastructure monitor. Larger credit grants, refunds, payment records, support notes, raw chat content, and API-key controls are **not** part of this console yet. Do not use this screen to represent a payment as completed; manual plan changes and credit grants are operator actions.

## Existing-account index

New accounts and personal workspaces receive `gsi2` discovery keys automatically in Aurora `store_items`. Before using the dashboard with pre-existing rows, backfill older records:

```sh
ARIA_DATABASE_URL='postgresql://...' npm run admin:backfill
ARIA_DATABASE_URL='postgresql://...' npm run admin:backfill -- --apply
```

The first command is a dry run and prints counts only. The second updates missing `gsi2` keys on PROFILE and workspace META rows in Aurora `store_items`. Run it from a host that can reach the database. No customer text, prompts, or secrets are printed.

## Verification

Run `npm test`, `npm run typecheck`, and `npm run build`. In local preview, confirm Alex can open `/internal/`, Blair receives an access error, search finds both users after each has signed in, plan changes update the ledger, duplicate submissions do not charge twice, and the activity list shows the actor and reason. Check the customer table at phone and desktop widths. Before production use, verify the allowlist, account-revocation runbook, Aurora migrations/backfill, and a real Cognito session in staging.
