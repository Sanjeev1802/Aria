# syntax=docker/dockerfile:1
# Node 24: the dev ledger imports node:sqlite, which needs Node >= 22.13.
ARG NODE_IMAGE=public.ecr.aws/docker/library/node:24-alpine

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM ${NODE_IMAGE} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Baked into the client bundle for encrypted sign-in POST bodies (must match ARIA_AUTH_PAYLOAD_KEY at runtime).
ARG NEXT_PUBLIC_ARIA_AUTH_PAYLOAD_KEY
ENV NEXT_PUBLIC_ARIA_AUTH_PAYLOAD_KEY=$NEXT_PUBLIC_ARIA_AUTH_PAYLOAD_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
# prepare-standalone (postbuild) already copied static assets and public/ into standalone.
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
