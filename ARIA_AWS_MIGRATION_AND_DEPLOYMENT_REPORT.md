# ARIA AWS Migration and Deployment Report

| Field | Value |
| --- | --- |
| Repository | The-Binary-Holdings/Aria |
| Branch | `Bedrock-deployment` |
| Region | `ap-southeast-1` |
| Auth | Amazon Cognito (Firebase **removed**) |
| Database | Aurora PostgreSQL via Prisma |
| AI | Amazon Bedrock Converse (`apac.amazon.nova-micro-v1:0`) |
| Compute target | ECS Fargate behind an ALB |
| CI/CD | GitHub → CodePipeline → CodeBuild → ECR → ECS |

This document is the implementation record for the product-team requirements. Code, schema, and infra files listed here are in the repository.

---

## 1. Executive summary

ARIA is now an AWS-native Next.js 16 application:

1. **Firebase Authentication is gone.** Sign up, sign in, sign out, forgot password, email confirmation, JWT verification, and dashboard protection use **Amazon Cognito**.
2. **Chat history is no longer `localStorage`.** Conversations and messages persist in **Aurora PostgreSQL** through Prisma.
3. **`POST /api/chat` requires a valid Cognito ID token.** Unauthenticated Bedrock calls are rejected with 401.
4. **Container + pipeline artifacts exist:** `Dockerfile`, `output: "standalone"`, `/api/health`, `buildspec.yml`, `infra/ecs-task-definition.json`, `infra/codepipeline.json`.
5. **Secrets belong in Secrets Manager** (`aria/prod`, `aria/build`). `NEXT_PUBLIC_COGNITO_*` must also be present at **image build** time.

Firebase users **cannot** keep their old passwords automatically. They must create a Cognito account (or be imported with a forced reset). Local chat history on devices is **not** migrated.

---

## 2. What changed in the repository

### Removed

| Item | Previous path |
| --- | --- |
| `firebase` npm package | `package.json` |
| Firebase app bootstrap | `lib/auth/client.ts` (deleted) |
| Firebase Auth provider | Replaced `lib/auth/auth-provider.tsx` |
| `NEXT_PUBLIC_FIREBASE_*` / `FIREBASE_*` | `.env.example` |

### Added — authentication

| Path | Role |
| --- | --- |
| `lib/auth/cognito-client.ts` | Sign up, confirm, sign in (SRP), sign out, forgot/reset password |
| `lib/auth/verify-jwt.ts` | `aws-jwt-verify` for Cognito ID tokens |
| `lib/auth/require-user.ts` | API guard + user upsert |
| `lib/auth/errors.ts` | Customer-safe Cognito errors |
| `app/sign-up/page.tsx` | Registration |
| `app/confirm/page.tsx` | Email confirmation code |
| `app/forgot-password/page.tsx` | Reset request + new password |
| `app/api/auth/session/route.ts` | HttpOnly `aria_id_token` cookie |
| `middleware.ts` | Redirects `/dashboard/*` without cookie to `/sign-in` |

### Added — data

| Path | Role |
| --- | --- |
| `prisma/schema.prisma` | User, Conversation, Message |
| `prisma/migrations/20260914120000_init/migration.sql` | Prisma migration |
| `prisma/sql/001_init.sql` | Standalone SQL for ops |
| `lib/db/prisma.ts` | Prisma client singleton |
| `lib/db/users.ts` | Upsert from Cognito JWT (`cognito_sub`) |
| `app/api/conversations/route.ts` | List / create |
| `app/api/conversations/[id]/route.ts` | Get / rename / delete |
| `lib/aria/conversation-api.ts` | Browser client for those routes |

### Added — platform

| Path | Role |
| --- | --- |
| `app/api/health/route.ts` | ALB / ECS health (`GET /api/health`) |
| `next.config.ts` | `output: "standalone"` |
| `Dockerfile` + `docker-entrypoint.sh` | Image + `prisma migrate deploy` |
| `buildspec.yml` | CodeBuild |
| `infra/ecs-task-definition.json` | Fargate task |
| `infra/codepipeline.json` | Three-stage pipeline |

### Hardened

| Path | Change |
| --- | --- |
| `app/api/chat/route.ts` | JWT required; persists user + assistant messages; requires `conversationId` |
| `lib/aria/chat-client.ts` | Sends `Authorization: Bearer` + `conversationId` |
| `components/chat/AriaShell.tsx` | Loads/saves threads via API, not `lib/aria/conversations.ts` |

Settings, theme, and plan selection still use `localStorage` (`lib/aria/settings.ts`, `plans.ts`, `tokens.ts`). Product asked only to persist **chat history**.

---

## 3. Cognito migration report

### Before

- Client SDK: `firebase` (`lib/auth/client.ts`, `lib/auth/auth-provider.tsx`)
- Flows: email/password **sign in** and **sign out** only
- Dashboard gate: client `RequireAuth` only
- `/api/chat`: **no authentication**

### After

| Flow | UI | Implementation |
| --- | --- | --- |
| Sign up | `/sign-up` | `CognitoUserPool.signUp` with `email` + `name` |
| Confirm email | `/confirm` | `confirmRegistration` / `resendConfirmationCode` |
| Sign in | `/sign-in` | SRP `authenticateUser` |
| Sign out | Account menu | `CognitoUser.signOut` + cookie clear |
| Forgot password | `/forgot-password` | `forgotPassword` + `confirmPassword` |
| JWT validation | All `/api/*` except health | `CognitoJwtVerifier` (`tokenUse: "id"`) |
| Protected routes | `/dashboard/*` | `middleware.ts` cookie + `RequireAuth` |

### AWS Console — create the user pool (`ap-southeast-1`)

1. **Amazon Cognito** → **Create user pool**.
2. **Sign-in options:** Email.
3. **Required attributes:** email, name.
4. **Password policy:** min 8 characters (matches the sign-up form).
5. **MFA:** optional for v1.
6. **Self-registration:** enabled.
7. **Email:** Cognito default (or SES later).
8. **App client:**
   - Public client (**no client secret**).
   - Auth flows: **ALLOW_USER_SRP_AUTH**, **ALLOW_REFRESH_TOKEN_AUTH**.
   - Callback URLs not required (custom UI, no Hosted UI).
9. Copy **User pool ID** (`ap-southeast-1_XXXX`) and **App client ID** into:
   - `.env` for local
   - Secrets Manager `aria/build` and `aria/prod` for pipeline / ECS

### Environment

```
NEXT_PUBLIC_COGNITO_REGION=ap-southeast-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-southeast-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

These are baked into the browser bundle at `next build`. Changing the pool requires a **rebuild**.

### Existing Firebase users

Cognito cannot verify Firebase password hashes.

| Option | When to use |
| --- | --- |
| Users sign up again on `/sign-up` | Default for this release |
| Cognito CSV import + “reset password on first login” | If you have an email list |
| Cognito hosted migration Lambda (`UserMigration_Authentication`) | Only if you keep Firebase running during cutover |

Recommended cutover:

1. Stand up Cognito + Aurora + new app.
2. Announce a reset: “Create your ARIA account again.”
3. Disable Firebase Auth in the Firebase console after traffic is on Cognito.
4. Delete Firebase web config from any leftover secrets.

First successful Cognito sign-in creates a `users` row (`lib/db/users.ts`). The **first** row is `role = admin`.

---

## 4. Database schema and migrations

### Prisma models (`prisma/schema.prisma`)

| Model | Columns | Maps to |
| --- | --- | --- |
| `User` | `id`, `cognito_sub`, `email`, `full_name`, `role`, `status`, `created_at`, `updated_at` | `users` |
| `Conversation` | `id`, `user_id`, `title`, `created_at` | `conversations` |
| `Message` | `id`, `conversation_id`, `role`, `content`, `created_at` | `messages` |

`User.role`: `admin` \| `user`.  
`User.status`: `active` \| `invited` \| `disabled`.  
Deletes cascade: user → conversations → messages.

### Connection string

```
postgresql://aria_app:<password>@aria-prod.cluster-xxxx.ap-southeast-1.rds.amazonaws.com:5432/aria?sslmode=require
```

Local:

```
postgresql://aria:aria@127.0.0.1:5432/aria
```

Set as `DATABASE_URL` (never `NEXT_PUBLIC_`).

### Apply schema

**Preferred (ECS entrypoint and local):**

```bash
npx prisma migrate deploy
```

**Ops / one-shot SQL:** `prisma/sql/001_init.sql`

```bash
psql "$DATABASE_URL" -f prisma/sql/001_init.sql
```

Do not run the raw SQL **and** `migrate deploy` on the same empty database — pick one so `_prisma_migrations` stays consistent.

`docker-entrypoint.sh` runs `prisma migrate deploy` when `DATABASE_URL` is set, then `node server.js`.

### Aurora setup (Console, `ap-southeast-1`)

1. **RDS** → **Create database** → Aurora PostgreSQL (Serverless v2 is enough for this app).
2. Database name: `aria`.
3. Place in **private subnets**; security group inbound `5432` **only** from the ECS task SG.
4. Enable encryption at rest. No public access.
5. Store the URL in Secrets Manager `aria/prod` key `DATABASE_URL`.
6. First deploy applies the Prisma migration from the container.

No application data exists to migrate from Firebase (there was no Firestore usage). Browser `localStorage` threads stay on the old device only.

---

## 5. Chat persistence and API protection

```
Browser (Cognito session)
  → Authorization: Bearer <idToken>
  → POST /api/conversations          create thread
  → POST /api/chat { conversationId, messages }
       verify JWT → upsert User
       insert Message(role=user)
       Bedrock Converse
       insert Message(role=assistant)
  → GET /api/conversations/[id]      reload thread
```

`GET /api/health` is public (load balancer). Every other new API uses `requireUser()`.

---

## 6. Target architecture

```mermaid
flowchart LR
  GH["GitHub\nThe-Binary-Holdings/Aria\nBedrock-deployment"] --> CP["CodePipeline"]
  CP --> CB["CodeBuild\nbuildspec.yml"]
  CB --> ECR["ECR\naria"]
  ECR --> ECS["ECS Fargate\nNext.js :3000"]
  Users --> ALB["ALB :443"]
  ALB --> ECS
  ECS --> COG["Cognito\nUser Pool"]
  ECS --> AUR["Aurora PostgreSQL"]
  ECS --> BR["Bedrock\nNova Micro"]
  SM["Secrets Manager\naria/prod"] --> ECS
  SM --> CB
```

```mermaid
flowchart TB
  subgraph VPC["VPC ap-southeast-1"]
    ALB["ALB public subnets"]
    ECS["Fargate private subnets"]
    AUR["Aurora private subnets"]
    VPCE["Interface endpoints\nbedrock-runtime ecr logs secretsmanager"]
    ALB --> ECS
    ECS --> AUR
    ECS --> VPCE
  end
  Browser --> ALB
  Browser --> Cognito
```

---

## 7. Secrets Manager

### `aria/build` (CodeBuild — baked into the image)

```json
{
  "NEXT_PUBLIC_COGNITO_REGION": "ap-southeast-1",
  "NEXT_PUBLIC_COGNITO_USER_POOL_ID": "ap-southeast-1_XXXX",
  "NEXT_PUBLIC_COGNITO_CLIENT_ID": "xxxx"
}
```

### `aria/prod` (ECS runtime)

```json
{
  "DATABASE_URL": "postgresql://...",
  "BEDROCK_API_KEY": "...",
  "NEXT_PUBLIC_COGNITO_USER_POOL_ID": "ap-southeast-1_XXXX",
  "NEXT_PUBLIC_COGNITO_CLIENT_ID": "xxxx"
}
```

Task definition: `infra/ecs-task-definition.json`.  
`BEDROCK_REGION` / `BEDROCK_MODEL_ID` are plain environment variables (not secret).

IAM execution role needs `secretsmanager:GetSecretValue` on `aria/*`.

---

## 8. CI/CD and container

### Pipeline

Source: GitHub `The-Binary-Holdings/Aria` / `Bedrock-deployment`  
Build: `buildspec.yml` (typecheck, lint, Docker build, push)  
Deploy: ECS service `aria-web` on cluster `aria-prod` using `imagedefinitions.json`

JSON definition: `infra/codepipeline.json`. Replace `<account>` and the CodeStar connection ARN.

CodeBuild project **must** enable privileged mode (Docker-in-Docker) and set `AWS_ACCOUNT_ID`.

### Dockerfile

- Node 20 Alpine, multi-stage, non-root `nextjs`
- `prisma generate` + `next build` with Cognito build-args
- Entrypoint migrates the database, then starts `server.js` (standalone)

### Health

`GET /api/health` → `{ ok: true, service: "aria" }`  
ALB matcher 200, interval 30s, grace 60s. Idle timeout **120s** for Bedrock.

### ECS sizing (prod)

- 512 CPU / 1024 MB, **desired 2**, two AZs
- SG: inbound 3000 from ALB only; outbound 443 + 5432 to Aurora
- No public IP on tasks if VPC endpoints + Aurora SG are correct

---

## 9. AWS Console deployment procedure

1. **Cognito** — §3.
2. **Aurora PostgreSQL** — §4.
3. **ECR** — repository `aria` in `ap-southeast-1`.
4. **Secrets Manager** — `aria/build`, `aria/prod`.
5. **VPC** — public ALB subnets, private app + data subnets, endpoints.
6. **IAM** — `aria-ecs-execution`, `aria-ecs-task` (optional `bedrock:InvokeModel` later), CodeBuild, CodePipeline.
7. **CloudWatch** — `/ecs/aria-prod`.
8. **ECS cluster + task + service** — from `infra/ecs-task-definition.json`.
9. **ALB** — HTTPS 443 (ACM), target group IP mode port 3000, health `/api/health`.
10. **CodePipeline** — from `infra/codepipeline.json` + `buildspec.yml`.
11. **Route 53** — alias to ALB.
12. Smoke:
    - `curl -I https://<host>/api/health`
    - `/sign-up` → confirm email → `/sign-in`
    - `/dashboard` without cookie redirects to `/sign-in`
    - Send a chat; confirm rows in `conversations` / `messages`
    - `POST /api/chat` without `Authorization` returns 401

---

## 10. Local development

```bash
cp .env.example .env
# set COGNITO_*, DATABASE_URL, BEDROCK_*

npx prisma migrate deploy
npm run dev
```

Open `http://localhost:3000/sign-up`.

Without a database, the marketing site still renders; chat APIs will fail until `DATABASE_URL` is valid.

---

## 11. Security notes

- `/api/chat` is no longer a public Bedrock proxy.
- Customer errors still go through `lib/aria/public-errors.ts` (no Bedrock/Amazon leak).
- ID token is stored HttpOnly (`aria_id_token`) **and** used as Bearer from the Cognito SDK session.
- Prefer rotating any Bedrock key that was ever pasted in chat.
- Next step (not in this change): move Bedrock from API key to the ECS task role.

---

## 12. Checklist

### Development

- [ ] Cognito pool + public app client in `ap-southeast-1`
- [ ] `.env` from `.env.example` (no Firebase keys)
- [ ] Local or shared Postgres; `prisma migrate deploy`
- [ ] Sign up / confirm / sign in / forgot password
- [ ] Chat persists after refresh

### Staging / production

- [ ] Aurora not publicly reachable
- [ ] Secrets in Secrets Manager, not git
- [ ] Pipeline green on `Bedrock-deployment`
- [ ] Two Fargate tasks, HTTPS, `/api/health` green
- [ ] Firebase Auth disabled after cutover
- [ ] First operator account is admin (`users.role`)

---

## 13. File index

```
prisma/schema.prisma
prisma/migrations/20260914120000_init/migration.sql
prisma/sql/001_init.sql
lib/auth/*                    (Cognito; Firebase removed)
lib/db/prisma.ts
lib/db/users.ts
lib/aria/conversation-api.ts
app/sign-up  app/confirm  app/forgot-password
app/api/health  app/api/auth/session
app/api/conversations  app/api/chat
middleware.ts
Dockerfile  docker-entrypoint.sh  buildspec.yml
infra/ecs-task-definition.json
infra/codepipeline.json
```

---

*Implementation complete on branch `Bedrock-deployment`. Do not commit `.env`.*
