#!/usr/bin/env bash
# Create GitHub connection + CodePipeline for dev, beta, or prod AWS account.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGION="ap-southeast-1"
TEMPLATE="${ROOT}/infra/cloudformation/aria-pipeline.yaml"
ACCOUNTS_JSON="${ROOT}/infra/environments/accounts.json"

usage() {
  cat <<'EOF'
Usage: setup-codepipeline.sh <dev|beta|prod|all> [options]

Creates a CodePipeline that auto-deploys on push to the mapped Git branch:

  dev   → develop-aws  → BNII-Development  (124623493787)
  beta  → preview-aws   → BNII-Beta         (786971361224)
  prod  → prod-aws      → BNII-Production   (642155086245)

Options:
  --profile PROFILE           AWS CLI profile (default from accounts.json)
  --connection-arn ARN        Existing GitHub CodeStar connection ARN
  --repository OWNER/REPO     GitHub repo (default: The-Binary-Holdings/Aria)
  --branch BRANCH             Override branch name

Before the pipeline works, approve the GitHub connection in AWS Console:
  Developer Tools → Settings → Connections → Update pending connection

Examples:
  ./scripts/setup-codepipeline.sh dev
  ./scripts/setup-codepipeline.sh all
  ./scripts/setup-codepipeline.sh prod --profile bnii-prod
EOF
}

setup_env() {
  local env="$1"
  local profile="${2:-}"
  local connection_arn="${3:-}"
  local repository="${4:-}"
  local branch_override="${5:-}"

  local account_id stack_name cluster branch repo profile
  account_id=$(node -e "const a=require('${ACCOUNTS_JSON}');console.log(a.accounts['${env}'].accountId)")
  stack_name=$(node -e "const a=require('${ACCOUNTS_JSON}');console.log(a.accounts['${env}'].pipelineStackName)")
  cluster=$(node -e "const a=require('${ACCOUNTS_JSON}');console.log(a.accounts['${env}'].clusterName)")
  branch=$(node -e "const a=require('${ACCOUNTS_JSON}');console.log(a.accounts['${env}'].githubBranch)")
  repo=$(node -e "const a=require('${ACCOUNTS_JSON}');console.log(a.githubRepository)")
  profile="${profile:-$(node -e "const a=require('${ACCOUNTS_JSON}');console.log(a.accounts['${env}'].profile)")}"
  branch="${branch_override:-$branch}"
  repository="${repository:-$repo}"

  local aws_args=(--region "$REGION")
  if [[ -n "$profile" ]] && aws configure list-profiles 2>/dev/null | grep -qx "$profile"; then
    aws_args+=(--profile "$profile")
  fi

  echo ""
  echo "==> Setting up CodePipeline for ${env} (account ${account_id})"
  echo "    Branch: ${branch}  Cluster: ${cluster}  Repo: ${repository}"

  if [[ -z "$connection_arn" ]]; then
    connection_arn=$(aws codeconnections list-connections "${aws_args[@]}" \
      --query "Connections[?ConnectionStatus=='AVAILABLE' && ProviderType=='GitHub'] | [0].ConnectionArn" \
      --output text 2>/dev/null || true)
    if [[ -z "$connection_arn" || "$connection_arn" == "None" ]]; then
      echo "    Creating GitHub connection (requires browser approval)..."
      connection_arn=$(aws codeconnections create-connection \
        "${aws_args[@]}" \
        --provider-type GitHub \
        --connection-name "aria-github-${env}" \
        --query ConnectionArn --output text)
      echo ""
      echo "    *** ACTION REQUIRED — approve GitHub in browser ***"
      echo "    https://ap-southeast-1.console.aws.amazon.com/codesuite/settings/connections?region=ap-southeast-1"
      echo "    Connection name: aria-github-${env}"
      echo "    Account: ${account_id}"
      echo ""
      echo "    Waiting for connection to become AVAILABLE (up to 5 min)..."
      for _ in $(seq 1 30); do
        status=$(aws codeconnections get-connection \
          "${aws_args[@]}" --connection-arn "$connection_arn" \
          --query ConnectionStatus --output text)
        if [[ "$status" == "AVAILABLE" ]]; then
          echo "    Connection is AVAILABLE."
          break
        fi
        sleep 10
      done
      status=$(aws codeconnections get-connection \
        "${aws_args[@]}" --connection-arn "$connection_arn" \
        --query ConnectionStatus --output text)
      if [[ "$status" != "AVAILABLE" ]]; then
        echo "    Connection still ${status}. Re-run after approving in the console."
        echo "    Connection ARN: ${connection_arn}"
        return 1
      fi
    fi
  fi

  echo "    Deploying CloudFormation stack: ${stack_name}"
  aws cloudformation deploy \
    "${aws_args[@]}" \
    --template-file "$TEMPLATE" \
    --stack-name "$stack_name" \
    --parameter-overrides \
      "EnvironmentName=${env}" \
      "GitHubConnectionArn=${connection_arn}" \
      "GitHubRepository=${repository}" \
      "GitHubBranch=${branch}" \
      "EcsClusterName=${cluster}" \
    --capabilities CAPABILITY_NAMED_IAM \
    --no-fail-on-empty-changeset

  aws cloudformation describe-stacks \
    "${aws_args[@]}" \
    --stack-name "$stack_name" \
    --query "Stacks[0].Outputs" \
    --output table

  echo "    Pipeline ready. Push to branch '${branch}' to trigger a deploy."
}

ENV="${1:-}"
shift || true

if [[ -z "$ENV" ]]; then
  usage
  exit 1
fi

PROFILE=""
CONNECTION_ARN=""
REPOSITORY=""
BRANCH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile) PROFILE="$2"; shift 2 ;;
    --connection-arn) CONNECTION_ARN="$2"; shift 2 ;;
    --repository) REPOSITORY="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ "$ENV" == "all" ]]; then
  for e in dev beta prod; do
    setup_env "$e" "$PROFILE" "$CONNECTION_ARN" "$REPOSITORY" "$BRANCH" || true
  done
else
  if [[ ! "$ENV" =~ ^(dev|beta|prod)$ ]]; then
    usage
    exit 1
  fi
  setup_env "$ENV" "$PROFILE" "$CONNECTION_ARN" "$REPOSITORY" "$BRANCH"
fi
