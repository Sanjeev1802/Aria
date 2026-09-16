#!/usr/bin/env bash
# Deploy ARIA infrastructure to dev, beta, or prod AWS account.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGION="ap-southeast-1"
TEMPLATE="${ROOT}/infra/cloudformation/aria-stack.yaml"

usage() {
  cat <<'EOF'
Usage: setup-aws-env.sh <dev|beta|prod> [options]

Deploy the ARIA CloudFormation stack (Cognito, Aurora, ECS, ALB, ECR, CodePipeline).

Required environment / flags:
  --vpc-id VPC_ID                 Existing VPC ID
  --public-subnets SUBNET_IDS     Comma-separated public subnet IDs (ALB)
  --private-subnets SUBNET_IDS    Comma-separated private subnet IDs (ECS + Aurora)

Optional:
  --profile AWS_PROFILE           AWS CLI profile (default from accounts.json)
  --bedrock-key KEY               Bedrock API key (stored in Secrets Manager)
  --github-connection ARN         CodeStar GitHub connection ARN (enables pipeline)
  --certificate-arn ARN           ACM certificate for HTTPS
  --desired-count N               ECS task count (default from accounts.json)
  --branch BRANCH                 Git branch for pipeline (default from accounts.json)

Examples:
  ./scripts/setup-aws-env.sh dev \
    --vpc-id vpc-0abc123 \
    --public-subnets subnet-aaa,subnet-bbb \
    --private-subnets subnet-ccc,subnet-ddd \
    --profile bnii-dev \
    --bedrock-key "$BEDROCK_API_KEY"

  ./scripts/setup-aws-env.sh prod \
    --vpc-id vpc-prod \
    --public-subnets subnet-pub1,subnet-pub2 \
    --private-subnets subnet-priv1,subnet-priv2 \
    --github-connection arn:aws:codeconnections:ap-southeast-1:642155086245:connection/xxx \
    --certificate-arn arn:aws:acm:ap-southeast-1:642155086245:certificate/xxx
EOF
}

ENV="${1:-}"
shift || true

if [[ -z "$ENV" || ! "$ENV" =~ ^(dev|beta|prod)$ ]]; then
  usage
  exit 1
fi

VPC_ID=""
PUBLIC_SUBNETS=""
PRIVATE_SUBNETS=""
PROFILE=""
BEDROCK_KEY=""
GITHUB_CONNECTION=""
CERT_ARN=""
DESIRED_COUNT=""
BRANCH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --vpc-id) VPC_ID="$2"; shift 2 ;;
    --public-subnets) PUBLIC_SUBNETS="$2"; shift 2 ;;
    --private-subnets) PRIVATE_SUBNETS="$2"; shift 2 ;;
    --profile) PROFILE="$2"; shift 2 ;;
    --bedrock-key) BEDROCK_KEY="$2"; shift 2 ;;
    --github-connection) GITHUB_CONNECTION="$2"; shift 2 ;;
    --certificate-arn) CERT_ARN="$2"; shift 2 ;;
    --desired-count) DESIRED_COUNT="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ -z "$VPC_ID" || -z "$PUBLIC_SUBNETS" || -z "$PRIVATE_SUBNETS" ]]; then
  echo "Error: --vpc-id, --public-subnets, and --private-subnets are required." >&2
  exit 1
fi

ACCOUNTS_JSON="${ROOT}/infra/environments/accounts.json"
STACK_NAME=$(node -e "const a=require('${ACCOUNTS_JSON}');console.log(a.accounts['${ENV}'].stackName)")
DEFAULT_PROFILE=$(node -e "const a=require('${ACCOUNTS_JSON}');console.log(a.accounts['${ENV}'].profile)")
DEFAULT_COUNT=$(node -e "const a=require('${ACCOUNTS_JSON}');console.log(a.accounts['${ENV}'].desiredCount)")
DEFAULT_BRANCH=$(node -e "const a=require('${ACCOUNTS_JSON}');console.log(a.accounts['${ENV}'].githubBranch)")
ACCOUNT_ID=$(node -e "const a=require('${ACCOUNTS_JSON}');console.log(a.accounts['${ENV}'].accountId)")

PROFILE="${PROFILE:-$DEFAULT_PROFILE}"
DESIRED_COUNT="${DESIRED_COUNT:-$DEFAULT_COUNT}"
BRANCH="${BRANCH:-$DEFAULT_BRANCH}"

AWS_ARGS=(--region "$REGION")
if [[ -n "$PROFILE" ]]; then
  AWS_ARGS+=(--profile "$PROFILE")
fi

echo "==> Deploying ARIA stack '${STACK_NAME}' to ${ENV} (account ${ACCOUNT_ID})"

PARAMS=(
  "ParameterKey=EnvironmentName,ParameterValue=${ENV}"
  "ParameterKey=VpcId,ParameterValue=${VPC_ID}"
  "ParameterKey=PublicSubnetIds,ParameterValue=\"${PUBLIC_SUBNETS}\""
  "ParameterKey=PrivateSubnetIds,ParameterValue=\"${PRIVATE_SUBNETS}\""
  "ParameterKey=DesiredCount,ParameterValue=${DESIRED_COUNT}"
  "ParameterKey=GitHubBranch,ParameterValue=${BRANCH}"
)

if [[ -n "$GITHUB_CONNECTION" ]]; then
  PARAMS+=("ParameterKey=GitHubConnectionArn,ParameterValue=${GITHUB_CONNECTION}")
fi
if [[ -n "$CERT_ARN" ]]; then
  PARAMS+=("ParameterKey=CertificateArn,ParameterValue=${CERT_ARN}")
fi
if [[ -n "$BEDROCK_KEY" ]]; then
  PARAMS+=("ParameterKey=BedrockApiKey,ParameterValue=${BEDROCK_KEY}")
fi

aws cloudformation deploy \
  "${AWS_ARGS[@]}" \
  --template-file "$TEMPLATE" \
  --stack-name "$STACK_NAME" \
  --parameter-overrides "${PARAMS[@]}" \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset

echo ""
echo "==> Stack outputs"
aws cloudformation describe-stacks \
  "${AWS_ARGS[@]}" \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs" \
  --output table

ALB_DNS=$(aws cloudformation describe-stacks \
  "${AWS_ARGS[@]}" \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='AlbDnsName'].OutputValue" \
  --output text)

echo ""
echo "==> Next steps"
echo "1. Push an image or run CodePipeline to deploy the app container."
echo "2. Open http://${ALB_DNS}/api/health to verify."
echo "3. Register at http://${ALB_DNS}/sign-up"
if [[ -z "$BEDROCK_KEY" ]]; then
  echo "4. Update Bedrock API key:"
  echo "   aws secretsmanager put-secret-value ${AWS_ARGS[*]} \\"
  echo "     --secret-id aria/${ENV}/runtime \\"
  echo "     --secret-string '{\"BEDROCK_API_KEY\":\"YOUR_KEY\", ...}'"
fi
if [[ -z "$GITHUB_CONNECTION" ]]; then
  echo ""
  echo "Pipeline skipped (no --github-connection). Create a CodeStar connection in the"
  echo "AWS Console, then re-run with --github-connection to enable CI/CD."
fi
