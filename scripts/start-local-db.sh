#!/usr/bin/env bash
# Start local Postgres for development and apply Prisma migrations.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LOCAL_URL="postgresql://aria:aria@127.0.0.1:5432/aria"

ensure_local_role_and_db() {
  if ! command -v psql >/dev/null 2>&1; then
    echo "psql is required. Install Postgres (brew install postgresql@16) or Docker Desktop." >&2
    exit 1
  fi

  psql -d postgres -v ON_ERROR_STOP=0 -c "CREATE USER aria WITH PASSWORD 'aria';" >/dev/null 2>&1 || true
  psql -d postgres -v ON_ERROR_STOP=0 -c "CREATE DATABASE aria OWNER aria;" >/dev/null 2>&1 || true
  psql -d postgres -v ON_ERROR_STOP=0 -c "GRANT ALL PRIVILEGES ON DATABASE aria TO aria;" >/dev/null 2>&1 || true
}

if command -v docker >/dev/null 2>&1; then
  echo "Starting local Postgres via Docker..."
  docker compose up -d postgres

  echo "Waiting for Postgres..."
  for _ in $(seq 1 30); do
    if docker compose exec -T postgres pg_isready -U aria -d aria >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  if ! docker compose exec -T postgres pg_isready -U aria -d aria >/dev/null 2>&1; then
    echo "Postgres did not become ready in time." >&2
    exit 1
  fi
else
  echo "Docker not found. Using local Homebrew/system Postgres on port 5432..."
  if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    echo "Postgres is not running. Start it with: brew services start postgresql@16" >&2
    exit 1
  fi
  ensure_local_role_and_db
fi

echo "Applying migrations..."
DATABASE_URL="$LOCAL_URL" npx prisma migrate deploy

ENV_FILE="${ROOT}/.env.local"
if [[ -f "$ENV_FILE" ]]; then
  node <<NODE
const fs = require("fs");
const path = ${JSON.stringify(ENV_FILE)};
const localUrl = ${JSON.stringify(LOCAL_URL)};
const lines = fs.readFileSync(path, "utf8").split("\n");
const updates = {
  USE_LOCAL_DATABASE: "true",
  DATABASE_URL: localUrl,
};
const keys = new Set(Object.keys(updates));
const out = [];
const seen = new Set();

for (const line of lines) {
  const match = line.match(/^([A-Z0-9_]+)=/);
  if (match && keys.has(match[1])) {
    if (!seen.has(match[1])) {
      out.push(\`\${match[1]}=\${updates[match[1]]}\`);
      seen.add(match[1]);
    }
    continue;
  }
  if (match?.[1] === "USE_LOCAL_DATABASE") continue;
  out.push(line);
}

for (const [key, value] of Object.entries(updates)) {
  if (!seen.has(key)) out.push(\`\${key}=\${value}\`);
}

fs.writeFileSync(path, out.join("\n").replace(/\n+$/, "") + "\n");
console.log("Updated .env.local to use local Postgres.");
NODE
else
  cat > "$ENV_FILE" <<EOF
USE_LOCAL_DATABASE=true
DATABASE_URL=$LOCAL_URL
EOF
  echo "Created .env.local with local Postgres settings."
fi

echo ""
echo "Local database is ready."
echo "Restart the dev server: npm run dev"
