# ARIA: finish application code before AWS setup

Updated 21 October 2026. This is the active work order. Do not provision AWS or enable `ARIA_LIVE_CHAT` during these milestones. `CURSOR_HANDOFF.md` records what is already implemented and verified.

## Product boundary

Deliver a working local application with real server-owned data and a complete Free, Pro, and Team journey. Use injectable local services and deterministic test providers so every product flow can run without AWS credentials. Keep design preview clearly labeled and keep production model calls gated. Where the external service contract is unknown (Binary Labs ARIA data, payment merchant, email), finish the interface, state machine, UI states, and contract tests locally; never label fake data or a manual plan change as a paid or authorized live integration.

## Milestone 0 — reliable local end-to-end environment

- Save a reviewed baseline commit; the current worktree is largely untracked.
- Add a persistent development store implementing the existing `Store` contract (SQLite is available in the chosen Node runtime). MemoryStore remains the fast unit-test driver; DynamoStore remains the AWS driver. Do not change credit invariants.
- Provide a development-only local identity switcher with two named users in separate workspaces. Restrict it to `NODE_ENV=development` and loopback; never trust it in production. Provide a deterministic fake model that streams text and token usage through the same chat service. Show an unmistakable local-demo label.
- Acceptance: restart the dev server and retain accounts, workspaces, membership, and the credit ledger; two browser contexts cannot access each other's server data; local chat works without AWS and charges reported test tokens; production routes remain closed. Conversations, projects, sources, and keys gain persistence in later milestones.

## Milestone 1 — complete account and team experience

- Finish forgot/reset password, expired confirmation code, resend feedback, loading/disabled/error states, and session expiry UI against the injectable identity-provider interface. Add challenge states before enabling MFA in Cognito.
- Complete workspace switching, invitations, acceptance, removal, role management, seat limits, and empty/error states using existing server endpoints. Remove the remaining `aria-team-storage` authority in live mode.
- Acceptance: local users can complete the whole invitation journey and revoked members lose access immediately; all account screens recover cleanly from errors. Keep sign-out-all-devices behavior and label it accurately.

## Milestone 2 — server-owned chat, projects, and library

- Add tenant-scoped conversation/message CRUD and title/search/pagination. Connect the OpenUI storage adapter to server endpoints; migrate existing browser conversations deliberately and only after the user chooses the destination workspace. Support deletion and export.
- Add project CRUD and conversation assignment. Replace live use of `aria-projects-storage` and the hard-coded library list with server-owned data. Persist account settings and personalization by user/workspace.
- Acceptance: data survives reload/restart, switching accounts, and multiple devices; cross-tenant IDs return 404/403; deleted data disappears from search and exports; preview mode still shows sample content explicitly.

## Milestone 3 — authorized sources and ARIA Intelligence

- Start with user-owned TXT/PDF/CSV uploads; validate MIME, size, parsing errors, malware policy, ownership, and deletion. Store extracted chunks with source ID, version, page/row, timestamp, workspace ID, and access policy. A local keyword/FTS retrieval adapter is enough for development; define the replacement interface for AWS indexing later.
- Add an explicit Intelligence mode available to entitled workspaces. Retrieve only server-authorized sources, include bounded excerpts in the prompt, and produce verifiable citations. If no relevant source is found, say so. Untrusted document text cannot change system instructions or trigger actions.
- Define a separate connector contract for Binary Labs business data; do not invent endpoints or claim that uploaded files are that proprietary dataset.
- Acceptance: revoked/deleted/cross-team documents never appear in retrieval; citations link to real source positions; source-free answers show a clear limitation; original files are never passed wholesale to the model.

## Milestone 4 — responses and credits

- Keep the current Bedrock adapter and safe text renderer. Add request status, retry using the same idempotency ID, context truncation/summarization, and visible model/credit estimate before sending. Exclude untrusted client system messages.
- Count input with a supported Bedrock `CountTokens` call when available, or a proven conservative bound. Meter retrieved context and attachments as input. Keep final charges based on provider token metadata. Define and test failed stream, partial delivery, late settlement, crash, and reconciliation UX.
- Acceptance: balance and history always match the server ledger; no duplicate charge on retry; insufficient credits refuse before model invocation; no invented source badges or model fallback.

## Milestone 5 — developer API for Pro and Team

- Add one-time-display, hashed API keys with project/workspace ownership, scopes, expiry, rotation, revocation, and per-key limits. Implement versioned response, usage, capability, and request-status endpoints using the same chat service and wallet as the UI. Give Team admins control over workspace keys and approved source scopes.
- Add API documentation with streaming, errors, idempotency, budgets, and examples. Never expose an API key to browser storage after creation.
- Acceptance: Free keys denied; revoked keys fail immediately; browser and API spend the same credits; forged workspace/source claims fail; concurrent requests respect shared budgets.

## Milestone 6 — subscription code and pricing journey

- Freeze proposed plan terms before implementation: Bedrock Nova for Free, Pro, and Team, included credits, five included Team seats, UTC calendar periods, upgrade/downgrade/cancellation/payment-failure behavior. Keep price labels marked proposed until approved.
- Add a `BillingProvider` interface and local event fixture driver. Build checkout/portal pending/success/failure/canceled states and a signed-webhook verification boundary. Feed verified, idempotent events into existing `applyEntitlement`. Production checkout remains disabled until a merchant provider is chosen and connected.
- Acceptance: UI clicks cannot grant plans; duplicate/out-of-order events do not double grant; renewal, cancellation, unpaid state, and invoice links behave as specified; manual admin plan changes are labeled operator actions.

## Milestone 7 — release-quality code gate

- Add meaningful browser journeys for Free, Pro, Team, intelligence, and API keys using the local identity and fake model. Run `npm test`, `npm run typecheck`, `npm run build`, and keyboard/mobile accessibility checks. Measure chat first render, first-token display, and p95 at the expected local concurrency; record actual numbers.
- Audit logs for secrets and prompts, rate limits, retention/delete/export, dependency findings, secure response headers, and clear incident/reconciliation messages.
- Acceptance: all code paths pass locally; no screen silently falls back to seeded business data; production remains closed without external integrations. Update this file and `CURSOR_HANDOFF.md` after each milestone with evidence, unfinished items, and the next exact command.

## Only after the code gate

Provision staging Cognito, DynamoDB, Bedrock, object storage, queues, email, payments, domain, IAM, budgets, monitoring, and backup. Run the real-service staging checklist in `CURSOR_HANDOFF.md`. Enable `ARIA_LIVE_CHAT` only after those checks pass. AWS and payment services are still required for a public launch; local completion is an application-code milestone.

## Current next step

Milestone 0 is complete. Account/team flows from Milestone 1 are implemented except MFA challenge UI and role editing. Milestone 2 now has server-owned project CRUD, saved chat threads, project assignment/filtering, and per-chat JSON export. Optional public-web search through self-hosted SearXNG is also implemented; it is separate from the authorized-source work in Milestone 3. Continue with saved-chat search/pagination, server-owned library/personalization, and deliberate migration. See `CURSOR_HANDOFF.md` for verified tests and exact next Cursor prompt. Keep AWS and payments setup after the code gate.
