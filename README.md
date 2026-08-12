# Bnii ARIA

**ARIA** is an enterprise AI assistant that turns business data into trusted decisions. Connect analytics, reports, internal knowledge, APIs, and operational systems into one grounded workspace.

This repository is the **Aria platform monorepo** — marketing site, authenticated chat workspace, shared packages, and backend scaffolds.

---

## What we’re building

| Surface | Purpose |
| --- | --- |
| **Marketing (`web`)** | Product story, features, pricing, docs, blog, and access requests |
| **Dashboard (`/dashboard`)** | Signed-in ARIA chat experience (same app, port 3000) |
| **Admin / Docs** | Internal console and API documentation (scaffolded) |
| **Backend** | API, AI orchestration, analytics, documents, and workers (scaffolded) |

**Product flow today**

- **TRY ARIA** on marketing → contact / request access  
- **Sign in** → `/sign-in` → `/dashboard` chat (Firebase email/password)  
- Dashboard chat is gated behind authentication  

---

## Monorepo layout

```
aria/
├── apps/
│   ├── web/           # Marketing + sign-in + dashboard/chat → :3000
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

# Develop (single app on port 3000)
npm run dev            # http://localhost:3000
```

### Environment

| Variable | Role |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | Client Firebase config (sign-in) |
| `FIREBASE_*` | Admin SDK (server-only; when used) |
| `NEXT_PUBLIC_WEB_URL` | App origin (default `http://localhost:3000`) |

Copy `.env.example` at the repo root. Never commit `.env`. Place the same Firebase vars in `apps/web/.env.local` for Next.js.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run the web app on port 3000 |
| `npm run build` | Production build |
| `npm run lint` | Lint the web app |
| `npm run clean` | Clean build outputs |

---

## Architecture notes

- **Single origin:** Marketing, sign-in, and dashboard/chat all run on port 3000 (`apps/web`).  
- **Routes:** `/` marketing · `/sign-in` auth · `/dashboard` authenticated chat.  
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
