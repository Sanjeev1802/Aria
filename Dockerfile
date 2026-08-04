FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Fail fast if Firebase public config is missing at build time.
# Cloud Run runtime env vars do NOT fix NEXT_PUBLIC_* (they are inlined in the JS bundle).
RUN if [ ! -f .env.production ] && [ -z "$NEXT_PUBLIC_FIREBASE_API_KEY" ]; then \
      echo "ERROR: Missing Firebase config for build." && \
      echo "Ensure .env.production is uploaded (see .gcloudignore) or pass NEXT_PUBLIC_* build env." && \
      exit 1; \
    fi && \
    if [ -f .env.production ]; then \
      echo "Using .env.production for Next.js build"; \
      grep -E '^NEXT_PUBLIC_FIREBASE_' .env.production | cut -d= -f1; \
    fi

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 8080
CMD ["node", "server.js"]
