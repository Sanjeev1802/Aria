#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ] && [ -n "$DB_HOST" ] && [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ]; then
  DATABASE_URL="$(node -e 'const u=process.env.DB_USER;const p=process.env.DB_PASSWORD;const h=process.env.DB_HOST;const n=process.env.DB_NAME||"aria";process.stdout.write(`postgresql://${encodeURIComponent(u)}:${encodeURIComponent(p)}@${h}:5432/${n}?sslmode=require`)')"
  export DATABASE_URL
fi

if [ -n "$DATABASE_URL" ]; then
  prisma migrate deploy
fi
exec node server.js
