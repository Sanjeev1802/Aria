# Bnii ARIA

**ARIA** is an enterprise AI assistant that turns business data into trusted decisions. Connect analytics, reports, internal knowledge, APIs, and operational systems into one grounded workspace.

This repository is a **single Next.js application** — the marketing site, sign-in, and the authenticated ARIA chat workspace all run on one origin.

---

## Surfaces

| Route | Purpose |
| --- | --- |
| `/` | Marketing home |
| `/features` · `/pricing` | Product story and plans |
| `/blog` · `/docs` · `/changelog` · `/contact` | Resources and access requests |
| `/sign-in` | Firebase email/password authentication |
| `/dashboard` | Authenticated ARIA chat (gated) |
| `/dashboard/plans` | Plan and seat management |
| `/api/chat` | Server route that calls Amazon Bedrock and returns ARIA's reply |

---

## Project structure

```
Aria/
├── app/
│   ├── (marketing)/        # Public marketing routes + shared marketing layout
│   ├── api/chat/           # Chat endpoint (Bedrock, server-only)
│   ├── dashboard/          # Authenticated chat workspace
│   ├── sign-in/            # Auth entry point
│   ├── globals.css         # Theme tokens (light + dark)
│   └── layout.tsx          # Root layout + theme bootstrap
├── components/
│   ├── account/            # Account menu, settings, plans, users
│   ├── chat/               # Chat shell, thread, composer, sidebar
│   ├── features/ home/ layout/ pricing/ resources/
│   ├── providers.tsx       # App-wide providers
│   └── theme-provider.tsx  # Applies theme after hydration
├── lib/
│   ├── aria/               # Client state: conversations, settings, profile, tokens
│   │   └── model/          # ARIA model layer (see below)
│   ├── auth/               # Firebase client + AuthProvider / useAuth
│   └── data/               # Static content for marketing pages
├── next.config.ts
├── tsconfig.json           # "@/*" maps to the repo root
└── package.json
```

Imports use the `@/` alias, which resolves from the repo root — e.g. `@/lib/auth`, `@/components/chat/ChatThread`.

### The model layer (`lib/aria/model/`)

ARIA's behaviour lives in one place, split into modules so the system prompt can be reviewed like code.

```
lib/aria/model/
├── client.ts        # Bedrock Converse call
├── config.ts        # Model name, generation defaults, API key
├── search.ts        # Live-search heuristics + grounding cooldown
├── format.ts        # Section rendering helpers
├── types.ts
└── prompt/
    ├── identity.ts  mission.ts  context.ts  voice.ts
    ├── behavior.ts  rules.ts    tools.ts    output.ts
    ├── examples.ts              # Few-shot tone calibration
    ├── runtime.ts               # Current date, timezone, search status
    ├── user-prefs.ts            # Settings + profile injection
    └── index.ts                 # Assembles the final system prompt
```

Each prompt module exports one tagged section (`<identity>`, `<mission>`, …). `prompt/index.ts` composes the static sections with the dynamic ones on every request.

---

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript
- **Styling:** Tailwind CSS v4
- **Auth:** Firebase Authentication (email/password)
- **Model:** Amazon Bedrock (Nova Micro) via `@aws-sdk/client-bedrock-runtime`
- **Brand:** cream `#F0EEE6`, charcoal `#141413`, accent `#D88A68` · Geist + Newsreader

---

## Getting started

**Requirements:** Node.js 20+

```bash
npm install

cp .env.example .env
# Fill NEXT_PUBLIC_FIREBASE_* and BEDROCK_API_KEY

npm run dev            # http://localhost:3000
```

### Environment

| Variable | Role |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | Client Firebase config (sign-in) |
| `FIREBASE_*` | Admin SDK (server-only) |
| `NEXT_PUBLIC_WEB_URL` | App origin (default `http://localhost:3000`) |
| `BEDROCK_API_KEY` | Amazon Bedrock API key (server-only — never prefix with `NEXT_PUBLIC_`) |
| `BEDROCK_REGION` | AWS region (default `ap-southeast-1`) |
| `BEDROCK_MODEL_ID` | Model / inference profile (default `apac.amazon.nova-micro-v1:0`) |

Next.js reads `.env` from the repo root. Never commit it.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run clean` | Remove `.next` |

---

## Architecture notes

- **Single origin, single app.** Marketing, auth, and chat share one Next.js instance on port 3000.
- **Theme.** A blocking script in `app/layout.tsx` applies the stored preference before paint; `theme-provider.tsx` re-applies it after hydration. Tokens live in `app/globals.css`.
- **Server-only secrets.** `BEDROCK_API_KEY` is read only in the model layer; it never reaches the client.

---

## License / ownership

Private — The Binary Holdings. All rights reserved unless otherwise noted.
