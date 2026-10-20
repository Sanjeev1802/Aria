---
name: aria-auth-pages
description: Builds and maintains ARIA sign-in and sign-up pages using transitions.dev motion (modal open, texts reveal, error shake). Use when designing auth UI, /sign-in/, /sign-up/, or wiring preview login to WorkspaceBootstrapOverlay.
---

# ARIA auth pages

## Routes

| Path | Purpose |
| --- | --- |
| `/sign-in/` | `components/login-form.tsx`: email + password → `POST /api/auth/sign-in/` → `WorkspaceBootstrapOverlay` (`sign-in`) → `?next=` or `/chat/` |
| `/sign-up/` | `components/signup-form.tsx`: email + password → `POST /api/auth/sign-up/` → confirmation code → sign-in → overlay (`sign-up`) |
| `/invite/` | `components/auth/invite-accept-card.tsx`: accept a Team invitation token |

Live mode uses `lib/aria-session.ts` helpers (`ariaSignIn`, `ariaSignUp`, `ariaConfirmSignUp`) and shows the server's error message in `.t-error-msg`. Design preview (`NEXT_PUBLIC_ARIA_PREVIEW=true`) skips the server. Sessions are HttpOnly cookies; never store tokens or plan data in browser storage.

Landing **Sign in** nav links to `/sign-in/`. Plan CTAs may still use the home dialog for preview upsell.

## File map

- `app/sign-in/page.tsx`, `app/sign-up/page.tsx` — metadata + `AuthPageShell`
- `components/auth/auth-page-shell.tsx` — layout, `t-modal` + `t-stagger`
- `components/auth/auth-sign-in-form.tsx`, `auth-sign-up-form.tsx` — forms + validation
- `app/transitions-auth.css` — modal, shake, auth chrome (imported in `globals.css`)
- `lib/show-input-error.ts` — error-state-shake orchestration

## transitions.dev snippets in use

1. **Modal open / close** (`06-modal.md`) — `.auth-panel.t-modal` + `.is-open` on mount via `requestAnimationFrame`
2. **Texts reveal** (`18-texts-reveal.md`) — `.t-stagger` / `.t-stagger-line` (see `app/motion.css`)
3. **Error state shake** (`12-error-state-shake.md`) — `.t-input-wrap`, `.t-input`, `.t-error-msg`, call `showInputError(wrapRef.current)`

Do not strip `@media (prefers-reduced-motion: reduce)` blocks when editing auth CSS.

## Adding a field

1. Wrap the field in `.auth-field` > `.t-input-wrap` (only if it should shake on error).
2. Border lives on `.t-input`; input element inside has no border.
3. On invalid submit, `showInputError(ref)`; on input, `clearInputError(ref)`.

## Checklist after changes

- [ ] `npm run typecheck` and `npm run build` (static export includes new routes)
- [ ] Sign-in ↔ sign-up cross-links work with `trailingSlash: true`
- [ ] Bootstrap overlay routes to the destination; preview marker is set only in design preview
- [ ] `npm test` (auth/access tests in `tests/access.test.ts`)
