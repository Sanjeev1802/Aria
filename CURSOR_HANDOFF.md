# Continue ARIA in Cursor

> **Current user direction:** finish the application code and local journeys before AWS or other external setup. Follow `CODE_FIRST_PLAN.md` Milestones 0–7. The AWS staging checklist later in this file is a release gate, not the next task.

Updated: 2026-10-21 (Team member credit limits, profile editing, local plan testing, and ARIA-only composer; branch Aria-new-setup).

## Start here

Read `AGENTS.md`, `IMPLEMENTATION_PLAN.md`, this file, and `PROMPT_EVALUATION.md`, then the relevant source. Preserve the existing UI. The repository is committed and pushed to `origin/Aria-new-setup`. Do not reset or clean the directory.

**State:** Follow `CODE_FIRST_PLAN.md` Milestones 0–7 before AWS. Milestone 0 is complete. Milestone 1 account and team journeys have working routes and UI; MFA challenge UI and role editing remain. Milestone 2 has server-owned project CRUD, per-user/per-workspace saved chats, project assignment/filtering, and per-thread JSON export; pagination/search, library, and personalization remain. Milestones 3–7 remain open. Production identity, workspace authorization, entitlements, and the DynamoDB ledger driver remain in place. **No real AWS yet.** Production chat stays off without Cognito + DynamoDB + `ARIA_APP_ORIGIN` + `ARIA_LIVE_CHAT=enabled`. Local dev chat works with `ARIA_LOCAL_DEV=true` and uses the fake model (not Bedrock).

### Current code verification (2026-10-21)

- `npm test`: **71/71 pass**. `npm run typecheck` and `npm run build` pass. New tests cover Team member credit limits, settlement/refund/month renewal, and role checks. Profile tests cover authenticated name/photo editing, persistence, user isolation, unsafe input rejection, and cross-site writes. Earlier tests cover local plan changes, OneWave invitations, public search, project assignment, SQLite consistency, identity, and chat persistence.
- Recent commits: `c6a579b` (project assignment and responsive controls), `ef80748` (system prompt and truncated-answer notice), preceded by `0da6b3a` (saved threads). Verify `git status` and push status before further work.
- Browser smoke in an isolated local-dev copy verified project creation, a chat started inside that project and persisted with its project ID, moving the chat out of a project, and the mobile sidebar drawer. Viewports 320×700, 375×812, 390×844, 768×1024, 844×390, 1024×768, and 1440×900 had no horizontal overflow or page errors. The final production build passed.
- `SqliteStore` reads the latest disk state before transactions and rolls back failed writes. This is safe for the local demo, but rewrites the full item table on each write and is not the production data store.
- Authenticated projects use `/api/projects/` and are scoped to the selected workspace. Preview mode retains browser projects. Chat threads use `/api/threads/`; completed responses are saved after ledger settlement, and a user cannot load another user's thread. Selected project assignment is checked by the server, and Recents can filter or move chats and export JSON. A persistence failure is logged as `thread_save_deferred`; there is not yet a repair job for that event.
- The system prompt is versioned as `aria-2026-10-20.3` and explicitly constrains source claims, current data claims, company-data access, tool claims, secrets, and output format. Optional public web search passes bounded SearXNG excerpts as untrusted context and appends source links to the saved response. Bedrock `max_tokens` responses display and save a continuation notice. `PROMPT_EVALUATION.md` lists staging answer-quality checks; no real model evaluation has run.
- The existing forgot/reset pages were already implemented; no duplicate auth UI was added. Local confirmation codes now expire after 15 minutes and a resend renews the expiry.
- Team invites use OneWave's `aria-team-invitation` template when `EMAIL_SERVICE_URL` and `EMAIL_SERVICE_API_KEY` are configured. The existing verified-email, single-use invite flow remains authoritative. Email delivery is mocked in tests; real delivery needs staging verification. See `TEAM_EMAIL_SETUP.md`.
- The local sidebar can switch the current owner workspace among Free, Pro, and Team using `/api/auth/local-plan/`. It is loopback-development-only and changes plan and credits in one transaction. The composer no longer shows a provider dropdown or tier label. When the UI omits a model, the server chooses Nova for Free and Claude for Pro/Team from verified entitlements.
- Account settings now edits the signed-in user's display name and avatar through `PATCH /api/profile/`. The browser crops PNG/JPEG/WebP to a bounded 128 × 128 PNG; the server validates the payload and stores it in a separate `USER#id / AVATAR` item. Session/profile views load it, while normal authenticated requests read only the small profile item. The profile UI was checked at 390 × 844 for save, reload, and remove.
- Team owners and admins can set an individual monthly credit limit in Settings → Team. `PATCH /api/workspace/members/` writes the persistent member policy and current-month meter together. The ledger reserves against that meter in the same transaction as the shared pool, then settles or releases both meters together. The UTC month resets usage but retains the configured limit. Members see their own meter; admins can inspect the team.

### Milestone 0 — verified (2026-10-20)

- **`SqliteStore`** (`lib/server/store/sqlite-store.ts`): implements the shared `Store` contract; default path `.aria/local-dev.sqlite` when `NODE_ENV=development` and no `ARIA_DYNAMODB_TABLE`. **MemoryStore** stays the unit-test driver; **DynamoStore** unchanged.
- **Two local users** (loopback only): Alex and Blair (`lib/server/local-dev.ts`). Switch via sidebar control or `POST /api/auth/local-user/`; requests may also send `X-Aria-Local-User`. Never honored in production.
- **Deterministic fake model** (`lib/server/fake-model.ts`): streams through the real `createChatResponse` / ledger pipeline when `ARIA_LOCAL_DEV=true`; stable token usage for settlement tests.
- **UI:** banner “Local demo · deterministic test model · server ledger”; dashed “Local user” switcher in the chat sidebar.
- **Tests added** (`tests/local-dev.test.ts`): SQLite reopen persistence, cross-user isolation, fake-model credit settlement, production ignores local switches.
- **Commands:** `npm test` **48/48**, `npm run typecheck`, `npm run build` — all pass.

**Run locally:** copy `.env.example` → `.env.local`, set `ARIA_LOCAL_DEV=true`, `npm run dev`, open `http://127.0.0.1:3000/sign-in/` (any email/password signs in in local mode), use the sidebar switcher to change users. Data survives `npm run dev` restarts in `.aria/local-dev.sqlite` (gitignored).

**Branch:** `Aria-new-setup` is committed and pushed to `https://github.com/The-Binary-Holdings/Aria`. Keep changes in small, tested commits on this branch.

## What this pass completed

### 1. Identity (Amazon Cognito)
- Existing `/sign-in/` and `/sign-up/` forms (`components/login-form.tsx`, `components/signup-form.tsx`) now call server routes; sign-up adds an email confirmation-code step in the same card. Design preview (`NEXT_PUBLIC_ARIA_PREVIEW=true`) behaves exactly as before.
- Server routes under `app/api/auth/`: `sign-in`, `sign-up`, `confirm` (also resends codes), `refresh`, `sign-out`, `session`.
- The server calls Cognito (`USER_PASSWORD_AUTH`, `REFRESH_TOKEN_AUTH`, optional client secret) and stores tokens in HttpOnly, `SameSite=Lax`, `Secure` (`__Host-`/`__Secure-`) cookies. The refresh-token cookie is scoped to `/api/auth/`.
- Every request verifies both the access token and the ID token with AWS's `aws-jwt-verify`: RS256 signature against the pool JWKS, issuer, app client, token use, expiry, and a matching subject (`lib/server/auth/verifier.ts`).
- Sign-out revokes the Cognito refresh token and sets a server-side `sessionsRevokedAfter` timestamp, so every outstanding token for that user (all devices) is rejected immediately. Accounts can be disabled server-side.
- CSRF: cookie-authenticated writes must carry `Origin` equal to `ARIA_APP_ORIGIN` (in development, the request origin).
- The development-only loopback identity (`ARIA_LOCAL_DEV=true`) uses **Alex** and **Blair** (separate workspaces) and goes through the same account, workspace, and ledger code. It is never honored in production.

### 2. Workspaces, roles, and entitlements (server-owned)
- `lib/server/accounts/entitlements.ts`: Free (200 credits/mo, 1 seat, Nova only), Pro (6,000 credits, 1 seat, Nova + Claude, API flag), Team (20,000 shared credits, 5 seats, Nova + Claude, team management). Roles: owner, admin, member.
- `lib/server/accounts/directory.ts`: first sign-in creates a user and a personal Free workspace (race-safe). It also handles membership resolution, invitations, removal, and plan changes.
- The browser may *select* a workspace with `X-Aria-Workspace`; the server only honors it with an active membership. Otherwise it returns 404, or 403 `access_revoked` for former members. It never silently falls back to a different wallet when a workspace was named.
- Invitations: Team plan only; seat-limited (pending invites count); stored as a SHA-256 hash with a 7-day expiry; single-use; revocable; bound to the invited email, which must be verified. When OneWave is configured, ARIA emails the link and returns only delivery status. A failed send revokes the invite and releases its seat. Without email configuration, the inviting admin gets a one-time link for manual sharing.
- Removing a member revokes access at once. Ledger reservations also re-check membership inside the same transaction, so a request racing a removal is refused.
- `applyEntitlement` handles plan changes from billing events. It is idempotent per event ID and ignores out-of-order events. An upgrade tops up the current period by the allowance difference in the same transaction; a downgrade takes effect next period.
- UI now reads profile, plan, role, and allowed models from `/api/auth/session/` (`lib/aria-session.ts`). The hard-coded "Team" plan and preview persona apply only in design preview. The Claude option shows "Claude · Pro" and is disabled on Free. Non-admins don't see invite or remove controls.

### 3. Shared DynamoDB ledger (replaces SQLite)
- `lib/server/store/dynamo-store.ts`: single-table DynamoDB driver; `lib/server/store/memory-store.ts`: atomic test driver with the same condition semantics (including DynamoDB's one-write-per-item-per-transaction rule).
- `lib/server/accounting/credit-ledger.ts`: workspace monthly periods, request reservations, immutable events. A reservation is **one** transaction. It creates the request (only if new), debits the pool only if `available >= units`, takes the member's active-request lock, increments the per-minute rate counter, re-checks active membership, and re-checks that the plan is still the one the request was authorized under.
- Preserved rules: integer millicredits; conservative reservation; actual-token settlement; refund of the unused hold; full release on failure, abort, or missing usage; duplicate ID with the same content replays without a second model call or debit; duplicate ID with different content returns 409; pending or failed IDs return 409; one active request per member; 5 requests per minute per member; settle and release are idempotent; charge can never exceed the hold.
- New: settlement always posts to the period the hold was taken in (renewals can't move in-flight charges). Provider-call state is recorded before Bedrock is called. If settlement fails after an answer was delivered, the hold is kept for reconciliation instead of being refunded. `reconcile()` releases holds older than 10 minutes. Holds whose provider call had started are flagged `provider_cost_review`, and terminal status prevents any second provider call for that ID.
- `lib/server/handlers.ts` holds all API logic with injectable services; `app/api/**/route.ts` files are one-line wrappers.
- `scripts/aria-admin.ts` (`npm run admin -- <command>`): `set-plan`, `reconcile`, `disable-user`/`enable-user`, `revoke-sessions`, `balance`.
- `infra/dynamodb-table.json`: table definition for `aws dynamodb create-table --cli-input-json file://infra/dynamodb-table.json`.

Also fixed: `showInputError` parsed the minified CSS value `3s` as 3 ms, so auth errors vanished after ~0.3 s (preview included). Removed: `lib/server/local-ledger.ts`, `lib/server/local-context.ts`.

## What was verified (locally, 2026-10-20, Node 26.7.0)

- `npm test`: **48/48 pass** (43 from the identity/ledger pass plus 5 Milestone 0 local-dev tests). Prior coverage included:
  - Tokens: forged signature, expired, wrong client, wrong issuer, ID/access token swap, mismatched subjects.
  - Requests: unauthenticated and cross-site (CSRF) requests are rejected before any accounting; browser-supplied plan, credits, role, and workspace fields grant nothing.
  - Cross-team: an outsider can't read usage, session, or members, invite, remove, or spend in another workspace; request IDs are workspace-scoped.
  - Concurrency: 40 workers against one pool get exactly 10 holds and the totals reconcile exactly; one active request per member; rate limit.
  - Retries: concurrent duplicate reserves create one hold; concurrent settles post one event; a full chat retry calls the model once and charges once.
  - Crashes: before the provider call, after it started, and mid-transaction (no partial writes); settlement failure after delivery.
  - Billing periods: a renewal mid-request settles to the original period.
  - Revocation: removed member (including a removal racing the reservation, and a removal during an active stream: charged for the delivered answer, then blocked); signed-out tokens and refresh; disabled accounts; revoked, expired, and wrong-email invitations; seat limits; Free plan can't invite.
  - Billing events: idempotent, out-of-order, and upgrade top-up applied once.
  - DynamoDB driver: exact condition/update expressions; cancellation-reason mapping; bounded `TransactionConflict` retry.
- Mutation checks: removing the credit condition, the membership check, or both settle-once guards each makes the corresponding test fail.
- `npm run typecheck`: clean. `npm run build`: passes (11 dynamic API routes, `/invite/` page added).
- Production server smoke test (`npm start`): with nothing configured, every API returns 503 and pages render. With Cognito, table, and origin set but no `ARIA_LIVE_CHAT`, chat returns 503, signed-out requests 401, a garbage cookie 401 `invalid_session`, and a cross-origin sign-in 403.
- Browser (dev server): sign-up shows the server's error in the existing shake slot; `/chat/` with an unconfigured server shows "Live AI is not configured on this server" without redirect loops.
- `npm audit`: same 5 low-severity OpenUI math-rendering findings as before; nothing new.

**Not verified:** any real Cognito sign-in, real DynamoDB transaction, Bedrock call, payment, email delivery, load test, or deployment. DynamoDB Local couldn't run here (no Java or Docker). The in-memory store mirrors DynamoDB's documented condition semantics, but run the suite's scenarios against a real staging table before enabling chat.

## Needs AWS setup (owner actions; never paste secrets into chat)

1. **Cognito user pool + app client.** Email as the sign-in identifier, required email verification, password policy, `PreventUserExistenceErrors=ENABLED`. App client flows: `ALLOW_USER_PASSWORD_AUTH`, `ALLOW_REFRESH_TOKEN_AUTH`. Do not enable MFA or forced password change yet: the UI returns `auth_challenge_unsupported` (501) for challenges. A client secret is optional (`ARIA_COGNITO_CLIENT_SECRET`, server-only). Consider Cognito threat protection and an AWS WAF rate rule on `/api/auth/*`.
2. **DynamoDB table** from `infra/dynamodb-table.json` (rename per stage). Then enable TTL on attribute `ttl` (`aws dynamodb update-time-to-live --table-name <t> --time-to-live-specification Enabled=true,AttributeName=ttl`) and point-in-time recovery.
3. **IAM for the app runtime:** `dynamodb:GetItem`, `Query`, `PutItem`, `UpdateItem`, `DeleteItem`, `ConditionCheckItem`, `TransactWriteItems` on the table and `table/index/*`; `bedrock:InvokeModelWithResponseStream` on the exact model or inference-profile ARNs. The Cognito calls used are public client APIs and need no IAM.
4. **Environment** (see `.env.example`): `ARIA_COGNITO_USER_POOL_ID`, `ARIA_COGNITO_CLIENT_ID`, `ARIA_DYNAMODB_TABLE`, `ARIA_APP_ORIGIN`, `AWS_REGION`, Bedrock model IDs, verified rates, `ARIA_RATE_VERSION`. Keep `ARIA_LIVE_CHAT` unset until step 6.
5. **Scheduled reconciliation:** run `npm run admin -- reconcile` every 5–10 minutes (EventBridge Scheduler to a task or Lambda), alarm on `providerCostReview > 0`, and alarm on `settlement_deferred` / `release_deferred` log events.
6. **Staging gate before `ARIA_LIVE_CHAT=enabled`:** real sign-up, confirm, sign-in, refresh, sign-out; two users in different workspaces; a team invite, accept, and remove; concurrent sends from two browsers against one pool; kill the server mid-stream and reconcile; both Nova and Claude end to end, with Bedrock token usage matching ledger events.
7. Bedrock quotas, the region and data-residency decision, and the exact Claude and Nova IDs remain open (unchanged from the previous handoff).

## Needs payment-provider setup

- Pick the provider based on merchant country and currency. Implement checkout and the customer portal, then a **signed, idempotent webhook** that maps provider events to `directory.applyEntitlement(ledger, workspaceId, { plan, eventId, occurredAt })`. That function already handles duplicates, out-of-order delivery, and upgrade top-ups. Until then, operators can provision plans with `npm run admin -- set-plan <workspaceId> <plan> <eventId>`.
- Still to decide or build: anniversary billing periods (current periods are UTC calendar months, granted lazily on first use), extra Team seats ("+ additional seats at Pro rate"), what happens when Team is downgraded with more members than the new seat limit (currently: existing members stay, new invites are blocked), payment-failure and cancellation policy, invoices, refunds.
- Prices and allowances in `entitlements.ts` match the pricing page but are still proposals. Gating Claude to Pro/Team is my reading of "Pro Max & ARIA Plus model options". Confirm both.

## Known limitations

- Conservative byte-based reservations can hold more credits than needed. Replace with Bedrock CountTokens or a tested tokenizer bound.
- The client creates a new request ID per send. A session-refresh retry reuses it, but there is no general automatic-retry UI.
- Profile personalization and library still contain prototype data. Projects and conversations use server storage in authenticated mode; chats can be assigned to projects, but files cannot. Existing browser-only conversations are not migrated.
- Sign-out ends every session for the user, not just the current device.
- The reconciliation index uses one `RESERVED` partition key. That's fine for launch scale; shard it if reservation volume grows large.
- No authorized-source retrieval, developer API keys, or payment integration yet (see `CODE_FIRST_PLAN.md`, Milestones 3–6). Real OneWave delivery has not been verified. Public SearXNG search is separate from authorized business data; see `SEARXNG_SETUP.md`.

## Next Cursor task

> Stay on `Aria-new-setup`. Read `AGENTS.md`, `CODE_FIRST_PLAN.md`, `TEAM_EMAIL_SETUP.md`, `SEARXNG_SETUP.md`, and this handoff. Verify the current 71 tests and production build. Continue Milestone 2 with server-owned library/personalization, deliberate migration of preview/browser data, and saved-chat search/pagination. Then implement Milestones 3–7 in order. Keep authenticated data scoped to verified user and workspace, use the local identity/fake model for tests, and preserve production fail-closed behavior. Make one tested commit per coherent change and push to `origin/Aria-new-setup`. Do not provision AWS or payment providers yet.
