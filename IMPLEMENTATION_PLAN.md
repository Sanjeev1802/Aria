# ARIA implementation plan

Updated: 2026-10-20. This document describes the actual repository and takes precedence over older implementation assumptions in `plan.md`. The existing visual design is retained.

## Outcome and current boundary

Build a Next.js chat application using Amazon Nova and Claude through Amazon Bedrock, with server-authoritative usage accounting, Free/Pro/Team subscriptions, authorized business intelligence, and paid developer API access.

**The application is not production complete.** Identity (Cognito), workspace authorization, server-owned entitlements, and a shared DynamoDB ledger are implemented and locally tested, but have not run against real AWS. Production chat returns 503 unless Cognito, the DynamoDB table, `ARIA_APP_ORIGIN`, and the operator switch `ARIA_LIVE_CHAT=enabled` are all configured. Enable the switch only after the staging gate in `CURSOR_HANDOFF.md` passes.

### What Cursor already built

- Dark landing page, pricing, FAQ, auth screens, and workspace navigation.
- OpenUI AgentInterface chat, custom composer, response renderer, library/projects, account/profile/settings, team UI.
- Motion, responsive layouts, Markdown/code rendering, model-menu presentation.
- These are largely browser-backed preview features: the profile and Team subscription are seeded, auth pages do not establish a verified backend identity, and team/project records are local storage.
- Before this change, chat silently fell back to scripted responses. Clicking Send incremented credits by one, and token activity included randomized history.

### Implemented in this pass

- Next.js Node route handlers, standalone output instead of static export.
- Versioned server-owned ARIA prompt: clear answers, uncertainty, capability honesty, untrusted-content handling, no fabricated sources or private business access.
- AWS SDK Bedrock ConverseStream adapter for configured Nova/Claude model IDs.
- Safe AG-UI event stream feeding the existing OpenUI text renderer. Model text is escaped into a single TextContent component; it cannot create arbitrary UI programs.
- Request/body/context/output limits, 90-second provider deadline, cancellation, no automatic paid retries or silent model fallback.
- ~~Local SQLite ledger~~ replaced by the shared DynamoDB ledger (see "Identity and shared ledger pass" below). The same rules hold: integer millicredits, atomic reservations, immutable events, actual-token settlement, duplicate detection/replay, failed-request releases, one active request and five new requests/minute per member.
- `/api/usage/` returns the ledger balance and actual token history. Removed browser click-based billing and random activity. Cumulative history now iterates chronological columns.
- Explicit preview mode and development banner. File upload is disabled in live mode until parsing and permissions exist.
- Lazy-loaded secondary workspace screens. Reused Bedrock client; bounded conversation prevents unbounded token costs.
- Resolved the OpenUI/Zustand peer mismatch; removed unused runtime CLI dependency.

### Identity and shared ledger pass (2026-10-20)

- Cognito sign-in/sign-up/confirm/refresh/sign-out through server routes; HttpOnly cookies; access + ID token verification (`aws-jwt-verify`); server-side session revocation; Origin-based CSRF checks.
- Server-owned accounts: personal Free workspace on first sign-in, roles (owner/admin/member), hashed expiring single-use invitations bound to verified email, immediate revocation, idempotent and ordered plan changes (`applyEntitlement`).
- DynamoDB single-table store and credit ledger. One transaction per reservation checks credits, the member lock, the rate limit, active membership, and the authorized plan. Settlement is pinned to the reservation's period. Crash reconciliation flags provider-cost review.
- Browser state (plan, profile, team) now comes from `/api/auth/session/`; preview data remains only in design preview.
- Details, test coverage, and remaining AWS/payment setup: `CURSOR_HANDOFF.md`.

## Architecture and response flow

```mermaid
sequenceDiagram
  participant UI as Existing Next.js / OpenUI UI
  participant API as Server chat handler
  participant L as Credit ledger
  participant B as AWS Bedrock
  UI->>API: Request ID + messages + Nova/Claude choice
  API->>API: Identity gate, origin, size, role, model validation
  API->>L: Reserve bounded maximum credit charge
  L-->>API: Reservation or reject/replay
  API->>B: Server prompt + bounded history
  B-->>API: Text deltas
  API-->>UI: Escaped text over AG-UI SSE
  B-->>API: Final token usage
  API->>L: Settle actual tokens; release unused reservation
  API-->>UI: Completion event
  UI->>API: Fetch authoritative usage
```

Failure/cancellation: release the customer reservation and report an incomplete response. AWS may bill partial work; that cost is absorbed by ARIA under this development policy. Production needs cancellation-abuse controls and reconciliation of provider costs.

No business-data tools are connected. The prompt explicitly says so. A system prompt is not an authorization mechanism: source permissions must be enforced by server retrieval code.

## Credit specification

- Internal unit: 1 millicredit; 1,000 units = 1 credit.
- Proposed retail value: 1 credit = $0.001; not redeemable money.
- Input/output prices: USD per million tokens for the **exact** model/profile and region.
- Charge: `ceil(3 × (inputTokens × inputRate + outputTokens × outputRate)) + 500` units.
- Token totals come from Bedrock metadata. Word/character estimates never settle an invoice.
- Reservation uses a conservative byte-based input bound and maximum output. This is deliberately over-reserving and may reject a request that could fit at its final cost. Before production, replace with model-supported CountTokens or a documented, tested tokenizer bound, including tools and retrieval context.
- Store model ID and rate version with each request. Rate changes require a new version.
- A duplicate ID with different request content returns 409; an already-completed ID replays without another debit. Pending/failed IDs return 409. The current UI creates a new ID for each new send and does not automatically retry.
- Holds left by a crashed worker are released by `reconcile()` after 10 minutes. A hold that never reached the provider is released as-is. A hold whose provider call had started is released to the customer and flagged `provider_cost_review`. Either way the request ID becomes terminal, so it can never trigger a second provider call. The member's active-request lock expires after 2 minutes.
- The ledger stores response text for replay; no prompt persistence. Production needs retention/deletion policies, encryption, and access controls.

## Production work, in dependency order

### 1. Identity and workspace authorization

Implement Cognito login/logout/session refresh using a secure server session or verified JWTs; replace preview auth and profile. Validate issuer, audience/client, token type, expiry, signature, and workspace membership. Derive owner/plan from the server, never browser-supplied plan or user IDs. CSRF-protect cookie-authenticated writes.

Acceptance: unauthenticated requests rejected; forged/expired/wrong-client tokens rejected; removed member immediately loses access; cross-tenant conversation/usage/source reads rejected. Preserve existing auth-page design.

Status: implemented and locally tested for usage, members, and chat (conversations and sources are not server-stored yet). Pending: real Cognito staging verification, MFA/forced-password-change UI, password reset.

### 2. Shared durable ledger and production chat

Extract the local ledger contract into an adapter and implement DynamoDB transactions for workspace period balances, request reservations, and immutable events. Persist request price snapshot, owner, billing period, provider call state, tokens, and reconciliation state. Use conditional writes for credit and concurrency checks; enforce per-key/member/workspace budgets atomically.

Add durable reconciliation job, transaction metrics, failed-call provider-cost ledger, retention policy, monthly grants, idempotent renewal events, and secret-safe logs. Do not place SQLite on Lambda or share it across app replicas.

Acceptance: independent workers cannot overspend; request retries settle once; renewals cannot move in-flight charges to the wrong period; crashes recover without double calls/credits; restart/load tests pass. Only then replace the production guard.

Status: ledger, reconciliation (`npm run admin -- reconcile`), and the first four acceptance items are implemented and tested against the in-memory driver. Pending: real-table integration run, scheduled reconciliation, metrics/alarms, provider-cost ledger, retention policy, load test. The production guard is now the `ARIA_LIVE_CHAT` operator switch on top of required identity + ledger configuration.

### 3. Subscriptions

Choose payment provider based on supported merchant country and currency. Implement checkout, signed/idempotent webhooks, server-side entitlements, subscription portal, renewal/cancellation/downgrade, payment-failure policy, invoices, and refund accounting. Current Free/Pro/Team prices remain proposals.

Acceptance: checkout UI cannot grant a plan; duplicate/out-of-order events do not double-grant credits; cancellation and downgrade behavior matches customer terms.

### 4. Team and authorized intelligence

Replace local team records with workspace member/invitation APIs, hashed expiring invite tokens, admin roles, and revocation. Build S3 uploads plus asynchronous parsing/indexing (SQS), source status and deletion. Start with user-owned TXT/PDF data; implement source permissions before retrieval. The Binary Labs ARIA service requires its real contract and credentials; the marketing site is not an API specification.

Retrieval returns server-verified source IDs, excerpts, freshness, permissions, and citations. Do not index documents merely because a user supplied a URL. No made-up business answers in fallback mode.

Acceptance: tenants cannot retrieve each other's chunks; revoked sources disappear from retrieval; prompt injection inside documents cannot invoke tools/change policy; unknown answers state insufficient evidence.

### 5. Pro/Team developer API

Expose versioned response/usage/capability/request-status endpoints backed by the same model service and wallet. Implement scoped hashed API keys, one-time secret display, rotation/revocation, source/project restrictions, idempotency keys, request IDs, limits, and audit events. Keep secrets out of browsers.

Acceptance: Free API access denied; revoked keys fail immediately; key budget and workspace credit constraints are atomic; browser and API usage reconcile to one balance.

### 6. Deployment and 500-user launch

Use AWS CDK for CloudFront, Next.js server hosting (a supported Next.js AWS adapter or a Node container), Cognito, DynamoDB, S3, SQS, IAM roles, alarms, and budgets. Separate runtime secrets from public settings. Next standalone output needs server hosting; S3-only static hosting no longer runs this repository.

500 registered users is not 500 simultaneous generations. Confirm expected MAU, peak concurrency, requests/month, region, exact Claude model, Nova model, context lengths, output lengths, and model mix. Older Nova-only cost estimates in `plan.md` exclude Claude and are not a launch budget.

Acceptance: provision actual Bedrock quotas, exercise both models, benchmark streamed p50/p95 latency and time to first token, check mobile accessibility, test cancellation/load/recovery, alarms and restore drill. Define retention and deletion behavior. No paid public launch until identity, ledger, billing, and tenancy checks pass.

## Free development resources

Node test runner + tsx, Playwright, an in-memory DynamoDB-semantics store for tests and local development, AWS SDK, `aws-jwt-verify`, Next.js, existing OpenUI renderer, and shadcn component source. No new paid UI/Gateway subscription is required by this implementation.

The repository's OpenUI guidance recommends Gateway for generated UI validation/fallbacks. This implementation honors the requested direct Bedrock provider and emits a fixed escaped text component, not model-generated UI programs. Gateway remains an optional later integration to evaluate, not an unrequested dependency.

Bedrock is paid. Free tooling does not make model inference free. Do not test paid models automatically without an explicitly configured development account.

## Primary references

- [AWS ConverseStream](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ConverseStream.html): stream events and usage metadata.
- [AWS CountTokens](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_CountTokens.html): preflight counting where model support permits.
- [AWS Bedrock pricing](https://aws.amazon.com/bedrock/pricing/): exact model/region pricing must be confirmed before configuring rates.
- OpenUI APIs were checked against installed 0.18.1 headless/UI types and 1.0.1 language package.

## Verification

See `CURSOR_HANDOFF.md` for commands and final verification results. Tests use an injected fake provider; they do not claim that AWS credentials, account quotas, or real model responses have been verified.
