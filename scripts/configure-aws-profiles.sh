#!/usr/bin/env bash
# Print AWS CLI profile snippets for the three BNII accounts.
set -euo pipefail

cat <<'EOF'
Add these profiles to ~/.aws/config (use SSO or access keys as your org requires):

[profile bnii-dev]
region = ap-southeast-1
# sso_account_id = 124623493787
# sso_role_name = AdministratorAccess

[profile bnii-beta]
region = ap-southeast-1
# sso_account_id = 786971361224
# sso_role_name = AdministratorAccess

[profile bnii-prod]
region = ap-southeast-1
# sso_account_id = 642155086245
# sso_role_name = AdministratorAccess

Verify each profile:
  aws sts get-caller-identity --profile bnii-dev
  aws sts get-caller-identity --profile bnii-beta
  aws sts get-caller-identity --profile bnii-prod

Deploy order (recommended):
  1. dev   — ./scripts/setup-aws-env.sh dev ...
  2. beta  — ./scripts/setup-aws-env.sh beta ...
  3. prod  — ./scripts/setup-aws-env.sh prod ...
EOF
