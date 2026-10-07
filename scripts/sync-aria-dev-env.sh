#!/usr/bin/env bash
# Build/update aria-dev secret in Secrets Manager and merge values into .env.local.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGION="ap-southeast-1"
SECRET_ID="aria-dev"
ENV_FILE="${ROOT}/.env.local"
CF_URL="https://dwia25h9cs3j3.cloudfront.net"
ALB_URL="http://aria-dev-1489437319.ap-southeast-1.elb.amazonaws.com"

aws_cmd() {
  if aws sts get-caller-identity --region "$REGION" >/dev/null 2>&1; then
    aws --region "$REGION" "$@"
    return
  fi
  echo "AWS is not authenticated. Run: aws login --region ${REGION}" >&2
  exit 1
}

echo "Fetching Cognito, Aurora, and existing secret..."
POOL_ID="ap-southeast-1_Hk1Q92DEZ"
CLIENT_ID=$(aws_cmd cognito-idp list-user-pool-clients --user-pool-id "$POOL_ID" \
  --query "UserPoolClients[?ClientName=='aria-web'].ClientId | [0]" --output text)
AURORA=$(aws_cmd rds describe-db-clusters \
  --query "DBClusters[?DBClusterIdentifier=='aria-prod'].Endpoint | [0]" --output text)
DB_SECRET_ARN=$(aws_cmd rds describe-db-clusters \
  --query "DBClusters[?DBClusterIdentifier=='aria-prod'].MasterUserSecret.SecretArn | [0]" --output text)
DB_JSON=$(aws_cmd secretsmanager get-secret-value --secret-id "$DB_SECRET_ARN" --query SecretString --output text)
EXISTING=$(aws_cmd secretsmanager get-secret-value --secret-id "$SECRET_ID" --query SecretString --output text 2>/dev/null || echo "{}")

node - "$POOL_ID" "$CLIENT_ID" "$AURORA" "$DB_JSON" "$EXISTING" "$CF_URL" "$ALB_URL" "$ENV_FILE" "$SECRET_ID" <<'NODE'
const [poolId, clientId, aurora, dbJsonRaw, existingRaw, cfUrl, albUrl, envFile, secretId] = process.argv.slice(2);
const db = JSON.parse(dbJsonRaw);
const existing = JSON.parse(existingRaw || "{}");
const dbUser = db.username || existing.DB_USER || "aria_admin";
const dbPass = db.password || existing.DB_PASSWORD || "";
const dbHost = aurora || existing.DB_HOST || "";
const dbName = "aria";
const databaseUrl =
  dbUser && dbPass && dbHost
    ? `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPass)}@${dbHost}:5432/${dbName}?sslmode=require`
    : existing.DATABASE_URL || "";

const secret = {
  NEXT_PUBLIC_WEB_URL: cfUrl,
  ARIA_PUBLIC_URL: cfUrl,
  ARIA_EMBED_SECRET: existing.ARIA_EMBED_SECRET || "",
  ARIA_FRAME_ANCESTORS: `'self' ${cfUrl} ${albUrl} http://localhost:3000 http://127.0.0.1:3000`,
  NEXT_PUBLIC_COGNITO_REGION: "ap-southeast-1",
  NEXT_PUBLIC_COGNITO_USER_POOL_ID: poolId,
  NEXT_PUBLIC_COGNITO_CLIENT_ID: clientId,
  DATABASE_URL: databaseUrl,
  DB_HOST: dbHost,
  DB_NAME: dbName,
  DB_USER: dbUser,
  DB_PASSWORD: dbPass,
  ANTHROPIC_API_KEY: existing.ANTHROPIC_API_KEY || "",
  ANTHROPIC_MODEL_ID: existing.ANTHROPIC_MODEL_ID || "claude-sonnet-4-6",
  BEDROCK_API_KEY: existing.BEDROCK_API_KEY || "",
  BEDROCK_REGION: existing.BEDROCK_REGION || "ap-southeast-1",
  BEDROCK_MODEL_ID: existing.BEDROCK_MODEL_ID || "apac.amazon.nova-micro-v1:0",
  BEDROCK_ENABLE_SEARCH: existing.BEDROCK_ENABLE_SEARCH || "false",
};

const fs = require("fs");
const { execSync } = require("child_process");

const useLocalDatabase =
  fs.existsSync(envFile) &&
  /^USE_LOCAL_DATABASE=true\s*$/m.test(fs.readFileSync(envFile, "utf8"));

if (fs.existsSync(envFile)) {
  const localEnv = fs.readFileSync(envFile, "utf8");
  for (const key of ["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL_ID", "BEDROCK_API_KEY"]) {
    const match = localEnv.match(new RegExp(`^${key}=(.+)$`, "m"));
    if (match?.[1]) secret[key] = match[1];
  }
}

if (!secret.DATABASE_URL) {
  console.error("Could not build DATABASE_URL. Check Aurora endpoint and RDS master secret.");
  process.exit(1);
}

execSync(
  `aws secretsmanager put-secret-value --secret-id ${JSON.stringify(secretId)} --region ap-southeast-1 --secret-string ${JSON.stringify(JSON.stringify(secret))}`,
  { stdio: "inherit" },
);
console.log(`Updated Secrets Manager secret: ${secretId}`);

const existingLocal = fs.existsSync(envFile)
  ? fs.readFileSync(envFile, "utf8")
  : "";
const localDatabaseUrl =
  useLocalDatabase &&
  existingLocal.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();

const local = {
  USE_LOCAL_DATABASE: useLocalDatabase ? "true" : "",
  NEXT_PUBLIC_WEB_URL: "http://localhost:3000",
  ARIA_PUBLIC_URL: "http://localhost:3000",
  ARIA_EMBED_SECRET: secret.ARIA_EMBED_SECRET,
  ARIA_FRAME_ANCESTORS: `'self' http://localhost:3000 http://127.0.0.1:3000`,
  NEXT_PUBLIC_COGNITO_REGION: secret.NEXT_PUBLIC_COGNITO_REGION,
  NEXT_PUBLIC_COGNITO_USER_POOL_ID: secret.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  NEXT_PUBLIC_COGNITO_CLIENT_ID: secret.NEXT_PUBLIC_COGNITO_CLIENT_ID,
  DATABASE_URL: localDatabaseUrl || secret.DATABASE_URL,
  DB_HOST: secret.DB_HOST,
  DB_NAME: secret.DB_NAME,
  DB_USER: secret.DB_USER,
  DB_PASSWORD: secret.DB_PASSWORD,
  ANTHROPIC_API_KEY: secret.ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL_ID: secret.ANTHROPIC_MODEL_ID,
  BEDROCK_API_KEY: secret.BEDROCK_API_KEY,
  BEDROCK_REGION: secret.BEDROCK_REGION,
  BEDROCK_MODEL_ID: secret.BEDROCK_MODEL_ID,
  BEDROCK_ENABLE_SEARCH: secret.BEDROCK_ENABLE_SEARCH,
};

const lines = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8").split("\n") : [];
const keys = new Set(Object.keys(local));
const out = [];
const seen = new Set();

for (const line of lines) {
  const match = line.match(/^([A-Z0-9_]+)=/);
  if (match && keys.has(match[1])) {
    if (!seen.has(match[1])) {
      out.push(`${match[1]}=${local[match[1]]}`);
      seen.add(match[1]);
    }
    continue;
  }
  out.push(line);
}

for (const [key, value] of Object.entries(local)) {
  if (!seen.has(key)) out.push(`${key}=${value}`);
}

fs.writeFileSync(envFile, out.join("\n").replace(/\n+$/, "") + "\n");
console.log(`Updated ${envFile}`);
console.log("Restart dev server: npm run dev");
NODE
