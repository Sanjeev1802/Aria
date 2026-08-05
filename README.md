# Bnii ARIA

**ARIA** is an enterprise AI assistant that turns business data into trusted decisions. Connect analytics, reports, internal knowledge, APIs, and operational systems into one grounded workspace.

This repository is the **Aria platform monorepo** — marketing site, authenticated chat workspace, shared packages, and backend scaffolds.

---

## What we’re building

| Surface | Purpose |
| --- | --- |
| **Marketing (`web`)** | Product story, features, pricing, docs, blog, and access requests |
| **Workspace** | Signed-in ARIA chat experience |
| **Admin / Docs** | Internal console and API documentation (scaffolded) |
| **Backend** | API, AI orchestration, analytics, documents, and workers (scaffolded) |

**Product flow today**

- **TRY ARIA** on marketing → contact / request access  
- **Sign in** → workspace app (Firebase email/password)  
- Workspace chat is gated behind authentication  

---

## Monorepo layout

```
aria/
├── apps/
│   ├── web/           # Marketing site          → :3000
│   ├── workspace/     # Authenticated chat      → :3001
│   ├── admin/         # Admin console (scaffold)
│   └── docs/          # Docs site (scaffold)
├── packages/
│   ├── auth/          # Firebase client + AuthProvider
│   ├── ui/            # Shared UI primitives
│   ├── types/         # Shared TypeScript types
│   ├── config/        # Brand tokens + app URLs
│   └── utils/         # Shared helpers (e.g. cn)
├── backend/           # api · ai · analytics · documents · workers
├── database/
├── infrastructure/
└── turbo.json
```

Apps share auth, config, and UI through npm workspaces. Turbo orchestrates `dev`, `build`, and `lint`.

---

## Tech stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS  
- **Auth:** Firebase Authentication (email/password)  
- **Monorepo:** npm workspaces + Turborepo  
- **Motion / UI:** Motion, Lucide icons  
- **Brand:** cream `#F0EEE6`, charcoal `#141413`, accent `#D88A68` · Geist + Newsreader  

---

## Getting started

**Requirements:** Node.js 20+

```bash
# Install
npm install

# Env
cp .env.example .env
# Fill NEXT_PUBLIC_FIREBASE_* and app URLs

# Develop
npm run dev:web        # http://localhost:3000
npm run dev:workspace  # http://localhost:3001
npm run dev            # both (Turbo parallel)
```

### Environment

| Variable | Role |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | Client Firebase config (workspace sign-in) |
| `FIREBASE_*` | Admin SDK (server-only; when used) |
| `NEXT_PUBLIC_WEB_URL` | Marketing origin (default `http://localhost:3000`) |
| `NEXT_PUBLIC_WORKSPACE_URL` | Workspace origin (default `http://localhost:3001`) |

Copy `.env.example` at the repo root. Never commit `.env`.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run all app `dev` tasks in parallel |
| `npm run dev:web` | Marketing only |
| `npm run dev:workspace` | Workspace only |
| `npm run build` | Production build across workspaces |
| `npm run lint` | Lint workspaces |
| `npm run clean` | Clean build outputs |

---

## Architecture notes

- **Separate apps, shared session boundary:** Marketing and workspace run on different ports/origins. Auth lives on the workspace; marketing “Sign in” links into the workspace app.  
- **Shared packages:** Prefer `@aria/auth`, `@aria/config`, `@aria/ui`, etc. instead of duplicating client setup.  
- **Backend folders** under `backend/` are intentional scaffolds for upcoming API, AI, document, and worker services.

---

## Branch

Active development branch: [`aria-v2`](https://github.com/The-Binary-Holdings/Aria/tree/aria-v2)

```bash
git clone https://github.com/The-Binary-Holdings/Aria.git
cd Aria
git checkout aria-v2
```

---

## License / ownership

Private — The Binary Holdings. All rights reserved unless otherwise noted.
