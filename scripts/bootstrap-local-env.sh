#!/usr/bin/env bash
# Fetch Cognito + DATABASE_URL from AWS and merge into .env.local for local dev.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV="${1:-dev}"
REGION="ap-southeast-1"
SECRET_ID="aria-${ENV}"

ACCOUNTS_JSON="${ROOT}/infra/environments/accounts.json"
STACK_NAME=$(node -e "const a=require('${ACCOUNTS_JSON}');console.log(a.accounts['${ENV}'].stackName)")
PROFILE=$(node -e "const a=require('${ACCOUNTS_JSON}');console.log(a.accounts['${ENV}'].profile)")

aws_cmd() {
  if aws sts get-caller-identity --region "$REGION" >/dev/null 2>&1; then
    aws --region "$REGION" "$@"
    return
  fi
  if aws sts get-caller-identity --region "$REGION" --profile "$PROFILE" >/dev/null 2>&1; then
    aws --region "$REGION" --profile "$PROFILE" "$@"
    return
  fi
  echo "AWS is not authenticated. Run: aws login --region ${REGION}" >&2
  exit 1
}

POOL_ID=$(aws_cmd cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolId'].OutputValue" \
  --output text)

CLIENT_ID=$(aws_cmd cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='CognitoClientId'].OutputValue" \
  --output text)

SECRET_JSON=$(aws_cmd secretsmanager get-secret-value \
  --secret-id "$SECRET_ID" \
  --query SecretString \
  --output text)

ENV_FILE="${ROOT}/.env.local"
node <<NODE
const fs = require("fs");
const path = "${ENV_FILE}";
const secret = JSON.parse(process.argv[1]);
const lines = fs.existsSync(path)
  ? fs.readFileSync(path, "utf8").split("\n")
  : [];

const updates = {
  NEXT_PUBLIC_WEB_URL: "http://localhost:3000",
  ARIA_PUBLIC_URL: "http://localhost:3000",
  NEXT_PUBLIC_COGNITO_REGION: "${REGION}",
  NEXT_PUBLIC_COGNITO_USER_POOL_ID: "${POOL_ID}",
  NEXT_PUBLIC_COGNITO_CLIENT_ID: "${CLIENT_ID}",
  DATABASE_URL: secret.DATABASE_URL || "",
  ANTHROPIC_MODEL_ID: secret.ANTHROPIC_MODEL_ID || "claude-sonnet-4-6",
  BEDROCK_REGION: secret.BEDROCK_REGION || "${REGION}",
  BEDROCK_MODEL_ID: secret.BEDROCK_MODEL_ID || "apac.amazon.nova-micro-v1:0",
  BEDROCK_ENABLE_SEARCH: secret.BEDROCK_ENABLE_SEARCH || "false",
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
  out.push(line);
}

for (const [key, value] of Object.entries(updates)) {
  if (!seen.has(key)) {
    out.push(\`\${key}=\${value}\`);
  }
}

fs.writeFileSync(path, out.join("\n").replace(/\n+$/, "") + "\n");
console.log("Updated " + path);
if (!updates.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL was empty in secret ${SECRET_ID}");
  process.exit(1);
}
NODE "$SECRET_JSON"

echo "Done. Restart the dev server: npm run dev"
