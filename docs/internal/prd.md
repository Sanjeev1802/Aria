# ARIA Internal — Product Requirements Document

**Version:** 1.0  
**Updated:** 22 October 2026  
**Status:** Implemented foundation; production readiness and extended features remain  
**Branch:** `Aria-Internal-Dashbord`  
**Product entry:** `/internal/sign-in/` → `/internal/`

## 1. Product definition

ARIA Internal is the private administration console for the staff who operate ARIA. It gives authorized operators one place to inspect customers and workspaces, manage access, review credit balances, and make accountable account changes.

The console serves ARIA's internal staff. A customer who owns or administers a Team workspace does not automatically receive internal access. Customer team management remains in the ARIA application.

**Product promise:** Find the right account, understand its state, make an authorized change, and verify the outcome.

## 2. Problem and goals

Support, billing, and operations need a reliable way to resolve account issues without changing database records manually or relying on screenshots of customer balances.

The product must:

- Reduce the time needed to find a customer and understand their workspace access.
- Make plan, credit, and account changes available only to the appropriate staff role.
- Show data from the account directory and credit ledger with clear scope and freshness.
- Record the actor, target, reason, and outcome of administrative changes.
- Support the initial approximately 500-user launch and provide a path beyond bounded lists.
- Work on desktop, tablet, and mobile with keyboard-accessible controls.

This PRD distinguishes existing functionality from planned requirements. An implemented screen does not establish that its AWS integration has passed production validation.

## 3. Users and permissions

| Internal role | Inspect records | Change plans / grant credits | Enable, disable, revoke sessions |
| --- | --- | --- | --- |
| Super admin | Yes | Yes | Yes |
| Support | Yes | No | No |
| Billing | Yes | Yes | No |
| Operations | Yes | No | Yes |

These are the roles implemented today. They are assigned through server configuration using verified identity subjects. A role-management screen is planned; it must not be implied by the super-admin label.

All permissions must be checked on the server for every request. Hiding a button is a usability measure, not an authorization boundary. Operators must not grant credits to their own workspace or disable/revoke their own account through these controls.

## 4. Current implementation

| Area | Available now | Current boundary |
| --- | --- | --- |
| Operator login | Email/password sign-in, password visibility, server authorization check, denied-access state | Uses existing ARIA identity service; real Cognito staging verification remains |
| Overview | Account/workspace counts, active account count, Team count, current credit usage, plan chart, recent activity | Snapshot of listed records; no historical adoption or revenue metrics |
| Customers | Search by name/email/ID, status filter, profile drawer | Up to 500 indexed accounts; filters operate on loaded records |
| Workspaces | Search by workspace or owner, plan filter, owner links, seat and credit information | Up to 500 indexed workspaces; detailed review opens through the owner profile |
| Plans and credits | Plan changes, balance visibility, grants of up to 100 credits per action | Manual entitlements, not payment processing |
| Account controls | Enable, disable, revoke sessions | Role restricted and reason required |
| Audit activity | Recent operator actions with actor, target available in API, reason, time, and result | Overview API returns the latest 12 records; no full history browser |
| Operations | Configuration guidance and reconciliation command | Not a live infrastructure health monitor |
| Responsive shell | Sticky top bar, collapsible sidebar, operator identity, refresh state and timestamp | Further accessibility and production-scale validation required |

## 5. Information architecture

### Operator entry

`/internal/sign-in/` contains the ARIA identity, work email, password, password visibility control, recovery link, and entry button. It does not offer public administrator registration.

After successful authentication, the server must verify internal authorization before the browser enters the console. A valid customer account without an internal role receives a clear access-denied message. Session secrets remain in HttpOnly cookies.

### Workspace navigation

- **Overview:** current platform snapshot and shortcuts to common tasks.
- **Customers:** find an account, inspect memberships, and use authorized account controls.
- **Workspaces:** inspect ownership, plan, seat capacity, and usage.
- **Plans & credits:** review balances and perform permitted entitlement changes.

### Governance navigation

- **Audit activity:** review administrative changes and their outcomes.
- **Operations:** operator guidance today; verified service telemetry in a later release.

The sidebar footer displays the operator's name, internal role, and email. The top bar stays visible during page scrolling and must not cover modal controls or mobile navigation.

## 6. Functional requirements and acceptance criteria

### AUTH — Authentication and access

1. Use the existing ARIA authentication service; do not create a separate password store.
2. Reject unauthenticated and non-operator requests at every internal API route.
3. Show persistent, readable form errors and prevent duplicate submissions while sign-in is pending.
4. Do not treat design preview, browser role values, or customer Team roles as production authorization.
5. Provide a deliberate sign-out flow and validate privileged-session expiry before production release.

**Acceptance:** authorized staff reach the console; a normal customer cannot read internal data by directly calling its APIs. Local bypasses have no effect in production. Recovery and sign-out behavior are documented and tested.

### OVERVIEW — Platform snapshot

1. Display counts and balances from backend data, including zero and empty states.
2. Label credit usage as the current UTC monthly period.
3. Show loading, refresh progress, last successful refresh time, and errors.
4. Clearly label bounded totals. A filtered or capped list must not look like a complete platform total.
5. Do not invent uptime, revenue, growth, token costs, or historical trends.

**Acceptance:** displayed metrics match the records returned by the API. Failed refreshes preserve the prior successful snapshot and do not update its freshness timestamp.

### CUSTOMERS — Account investigation

1. Search loaded customers by name, email, or user ID and filter by active/disabled status.
2. Show account identity, status, memberships, seats, and workspace balances.
3. Provide keyboard-operable profile controls and clear loading, empty, and failure states.
4. Only Operations and Super admin can enable/disable accounts or revoke sessions.
5. Customer details must not be replaced by a stale response after another customer is selected.

**Acceptance:** search and filters combine correctly. Unauthorized actions are denied even when requested outside the UI. A failed customer lookup offers retry/close rather than remaining indefinitely in a loading state.

### WORKSPACES — Workspace investigation

1. Search by workspace name/ID and loaded owner details; filter by Free, Pro, or Team.
2. Show owner, plan, seats used/allowed, and current usage or available credits.
3. Provide a clear path to the owner and associated workspace controls.
4. Add a dedicated workspace detail view in the next release, including member roles and pending invitations.
5. Keep customer-facing Team credit limits separate from internal operator grants.

**Acceptance:** every control targets the intended workspace ID. Empty results are distinguishable from failed data loading. Cross-workspace changes cannot be made through manipulated browser state.

### CREDITS — Entitlements and adjustments

1. Plan changes and credit grants require a confirmation, a reason of 8–500 characters, and an action ID.
2. Grant amounts are positive, limited to 100 credits per action, and support the ledger's 0.001-credit precision.
3. Reject plan downgrades when occupied seats exceed the destination entitlement.
4. Preserve the credit ledger as the balance authority; do not edit displayed totals directly.
5. Preserve the same action ID when retrying the same uncertain operation. A network error must not create a second grant.
6. Show errors within the confirmation dialog; show success only after the server confirms it.
7. Make plan-change/audit recovery explicit because these currently occur in separate steps.

**Acceptance:** replaying one action produces no additional credit grant. A canceled confirmation makes no change. An uncertain response can be resolved safely. Every completed change has a discoverable audit record.

### AUDIT — Accountability

1. Record action ID, actor, target, action type, reason, timestamp, result, and relevant adjustment details.
2. Present the current recent-activity window honestly; it is not the entire audit history.
3. Add server pagination and filters by actor, target, action type, date, and result.
4. Define retention and export access before enabling reporting exports.
5. Do not include passwords, tokens, or raw customer conversation content in administrative logs.

**Acceptance:** a reviewer can trace an administrative change to its actor and reason. The full-history release supports paging without omissions or duplicate entries under a documented ordering model.

### OPERATIONS — Operational visibility

Current scope is guidance. A later release should show last successful checks, error rates, request latency, quota pressure, and reconciliation outcomes for configured services.

Every service status must come from a real check or telemetry source and include its timestamp. Missing telemetry displays “Unavailable” or “Not configured.” A green indicator must not imply infrastructure health without supporting data.

**Acceptance:** monitoring failure cannot appear as service health. Any future recovery action is permission checked, bounded, confirmed, and audited.

## 7. Design and interaction requirements

The visual direction is a precise command center: graphite surfaces, thin borders, clear typography, restrained ARIA green accents, and deliberate spacing. The design retains ARIA branding and uses no third-party logos or fabricated operational graphics.

- Use the installed shadcn components and shared visual tokens.
- Keep important data readable without color alone; label chart series and status badges.
- Keep the top bar sticky and the sidebar collapsible. Mobile navigation must close after a selection.
- Support widths from 320px through large desktop displays without page-level horizontal overflow. Wide data tables may scroll within their own container.
- Provide visible keyboard focus, accessible labels, sufficient contrast, and reduced-motion behavior.
- Dialogs and drawers must manage focus, support Escape where appropriate, restore focus on close, and prevent accidental actions.
- Avoid marketing content that pushes operational data unnecessarily far down the page.
- Provide consistent loading, empty, denied-access, success, error, and retry states.

**Accessibility target:** WCAG 2.2 AA for critical sign-in and operator workflows, subject to verification rather than an existing compliance claim.

## 8. Technical requirements

| Layer | Direction |
| --- | --- |
| Web application | Existing Next.js App Router, React, TypeScript, npm lockfile |
| UI | shadcn components, Tailwind/CSS, Lucide icons, Recharts |
| Identity | Existing ARIA authentication; Cognito for production |
| Authorization | Server-owned internal roles, independent of customer workspace roles |
| Persistence | Existing directory, credit ledger, and audit storage; DynamoDB in production |
| Local development | Existing local identity and SQLite-backed services, development only |
| Internal transport | Same-origin authenticated APIs; writes require origin checks; responses use `no-store` |
| Observability | Structured server logs today; dashboards/alerts planned |

Existing endpoints are `GET /api/admin/overview/`, `GET /api/admin/customers/:id/`, and `POST /api/admin/actions/`. Additional APIs must follow the same access checks and return only fields required by the operator workflow.

Do not cache internal responses in a shared public cache. Any future caching requires explicit tenant/role scoping and revocation behavior. Model inference is not required for ordinary dashboard operations.

## 9. Performance and success measures

These are proposed targets to measure in staging, not verified production results:

- Initial usable overview: p95 within 2 seconds on a representative desktop connection with approximately 500 accounts.
- Search/filter over loaded records: visible response within 200 ms.
- No duplicate committed grants across tested retry and concurrent-request scenarios.
- Every supported administrative write has a reason and a traceable audit outcome.
- A trained operator can locate a customer and inspect their balances within 30 seconds in a usability test.
- Critical workflows complete at phone and desktop widths using keyboard and pointer input.

Record the measurement environment and dataset with each result. Beyond the bounded launch dataset, use server pagination and indexed filtering rather than increasing unbounded client payloads.

## 10. Delivery plan

### Phase 1 — Foundation (implemented; staging validation outstanding)

Dedicated operator login, restricted APIs, role-scoped actions, current overview, customer/workspace filtering, plan and credit controls, recent audit activity, sticky navigation, and responsive styling.

### Phase 2 — Production hardening (next)

- Verify real Cognito sessions, disabled/revoked access, and configured roles in staging.
- Verify DynamoDB discovery indexes, existing-record backfill, and ledger/audit behavior.
- Preserve action identity through retries and expose uncertain outcomes safely.
- Resolve drawer focus, stale requests, lookup errors, and explicit operator sign-out.
- Verify atomic/recoverable plan-change auditing under injected failures.
- Add meaningful browser regression coverage for login, filters, confirmations, failure states, and keyboard use.
- Complete accessibility and 500-user dataset performance checks.
- Define staff MFA policy, audit retention, and operational ownership.

### Phase 3 — Complete operator workflows (planned)

Server-side search/pagination, full audit history, workspace details, controlled staff-role administration, support notes, and verified service monitoring. Each module requires permissions and acceptance tests before release.

### Phase 4 — Billing and analytics (planned, dependency gated)

Payment-provider integration, invoices and refunds, historical usage/token reports, cost visibility, exports, and API-key administration. These require the corresponding customer-facing services and reliable event data first.

## 11. Release gates

- All internal APIs reject unauthorized access and enforce the role matrix.
- Credit and account mutations pass replay, concurrency, and failure-recovery checks.
- Login and critical controls pass browser tests, including denied and expired sessions.
- Desktop/mobile layouts and keyboard interactions pass accessibility review.
- Production identity, storage, indexes, and audit access are verified in staging.
- Operator onboarding, offboarding, rollback, and incident ownership are documented.
- Implemented features and remaining limitations are stated in release notes.

The existing passing test/build results are foundation evidence; they do not substitute for these production gates.

## 12. Decisions still required

- Who owns operator access approval and emergency access removal?
- Which staff roles require MFA, and how will the existing auth flow support it?
- What audit retention and export rules apply?
- Should larger credit grants require a second approver, and at what threshold?
- Which payment provider and billing workflows will ARIA support?
- Which telemetry sources will power service health, cost, and usage history?
- Should customer-facing Team branding become “Max”? Keep the existing `team` identifier until a coordinated naming decision is made.

## 13. Source of implementation truth

- [Internal setup and operational boundaries](../../INTERNAL_ADMIN_SETUP.md)
- [Dashboard implementation](../../components/internal/internal-dashboard.tsx)
- [Operator sign-in](../../components/internal/internal-sign-in.tsx)
- [Server permissions and actions](../../lib/server/admin.ts)
- [Existing internal admin tests](../../tests/internal-admin.test.ts)
- [ARIA Chat PRD](../../prd.md) — separate customer-facing product scope
