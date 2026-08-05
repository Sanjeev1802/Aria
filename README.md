# Bnii ARIA

Monorepo for the Bnii ARIA platform.

## Structure

```
aria/
├── apps/
│   ├── web/             # Landing / marketing (port 3000)
│   ├── workspace/       # Signed-in ARIA chat (port 3001)
│   ├── admin/           # Admin console (scaffold)
│   └── docs/            # API docs site (scaffold)
├── packages/
│   ├── auth/            # Firebase auth client + provider
│   ├── ui/              # Shared UI primitives
│   ├── types/           # Shared TypeScript types
│   ├── config/          # Brand tokens + URLs
│   └── utils/           # Shared utilities (cn, etc.)
├── backend/             # API / AI / analytics / documents / workers
├── database/
└── infrastructure/
```

## Develop

```bash
npm install
npm run dev:web        # http://localhost:3000
npm run dev:workspace  # http://localhost:3001
# or both:
npm run dev
```

## Auth

Firebase email/password is configured via `.env` (`NEXT_PUBLIC_FIREBASE_*`).

- Marketing **Sign in** → workspace app
- Marketing **TRY ARIA** → contact form (request access)
- Workspace requires auth for the chat UI

## Environment

Copy `.env.example` and set Firebase keys plus:

```
NEXT_PUBLIC_WEB_URL=http://localhost:3000
NEXT_PUBLIC_WORKSPACE_URL=http://localhost:3001
```
