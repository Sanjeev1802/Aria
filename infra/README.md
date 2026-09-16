# ARIA AWS Infrastructure

Multi-account deployment for **BNII-Development**, **BNII-Beta**, and **BNII-Production**.

| Environment | Account ID | Profile | Git branch | Pipeline |
| --- | --- | --- | --- | --- |
| dev | 124623493787 | `bnii-dev` | `develop-aws` | `aria-dev` |
| beta | 786971361224 | `bnii-beta` | `preview-aws` | `aria-beta` |
| prod | 642155086245 | `bnii-prod` | `prod-aws` | `aria-prod` |

Push to the branch → CodePipeline builds Docker image → deploys to ECS in that account.

Region: **ap-southeast-1**

## Architecture

Each account receives an isolated stack:

- **Amazon Cognito** — user pool + public app client (replaces Firebase Auth)
- **Aurora PostgreSQL Serverless v2** — chat history via Prisma
- **ECS Fargate** — Next.js standalone container on port 3000
- **Application Load Balancer** — `/api/health` health checks
- **ECR** — `aria` container repository
- **Secrets Manager** — `aria/{env}/build`, `aria/{env}/runtime`, `aria/{env}/db-master`
- **CodePipeline + CodeBuild** — GitHub → Docker build → ECS deploy (optional)

Firebase is **not** used. See `ARIA_AWS_MIGRATION_AND_DEPLOYMENT_REPORT.md` for the migration record.

## Prerequisites

1. AWS CLI v2 with profiles for each account (`./scripts/configure-aws-profiles.sh`)
2. An existing VPC with public + private subnets in two AZs
3. (Optional) ACM certificate for HTTPS
4. (Optional) CodeStar connection to GitHub

## Set up auto-deploy (CodePipeline)

Each AWS account gets its own pipeline watching one Git branch:

```bash
# One account at a time (approve GitHub connection in Console when prompted)
./scripts/setup-codepipeline.sh dev
./scripts/setup-codepipeline.sh beta
./scripts/setup-codepipeline.sh prod

# Or all three (requires AWS login/profile per account)
./scripts/setup-codepipeline.sh all
```

After setup, any commit to `develop-aws`, `preview-aws`, or `prod-aws` in
`The-Binary-Holdings/Aria` triggers a build and ECS deploy in the matching account.

## Deploy an environment

```bash
chmod +x scripts/*.sh

# Development
./scripts/setup-aws-env.sh dev \
  --vpc-id vpc-xxxxxxxx \
  --public-subnets subnet-pub1,subnet-pub2 \
  --private-subnets subnet-priv1,subnet-priv2 \
  --profile bnii-dev \
  --bedrock-key "$BEDROCK_API_KEY"

# Beta
./scripts/setup-aws-env.sh beta \
  --vpc-id vpc-xxxxxxxx \
  --public-subnets subnet-pub1,subnet-pub2 \
  --private-subnets subnet-priv1,subnet-priv2 \
  --profile bnii-beta \
  --bedrock-key "$BEDROCK_API_KEY"

# Production (with HTTPS + pipeline)
./scripts/setup-aws-env.sh prod \
  --vpc-id vpc-xxxxxxxx \
  --public-subnets subnet-pub1,subnet-pub2 \
  --private-subnets subnet-priv1,subnet-priv2 \
  --profile bnii-prod \
  --bedrock-key "$BEDROCK_API_KEY" \
  --github-connection arn:aws:codeconnections:ap-southeast-1:642155086245:connection/xxx \
  --certificate-arn arn:aws:acm:ap-southeast-1:642155086245:certificate/xxx \
  --branch main
```

## First container deploy

Before the pipeline runs, push an initial image manually:

```bash
export AWS_PROFILE=bnii-dev
export ACCOUNT_ID=124623493787

aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com

docker build \
  --build-arg NEXT_PUBLIC_COGNITO_REGION=ap-southeast-1 \
  --build-arg NEXT_PUBLIC_COGNITO_USER_POOL_ID=<from stack output> \
  --build-arg NEXT_PUBLIC_COGNITO_CLIENT_ID=<from stack output> \
  -t $ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com/aria:latest .

docker push $ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com/aria:latest

aws ecs update-service --cluster aria-dev --service aria-web --force-new-deployment
```

## Local development against a deployed stack

```bash
./scripts/bootstrap-local-env.sh dev
# Fill DATABASE_URL and BEDROCK_API_KEY in .env
npx prisma migrate deploy
npm run dev
```

## Secrets layout

One secret per environment with all app config:

| Secret | Account | Used by |
| --- | --- | --- |
| `aria-dev` | BNII-Development | CodeBuild + ECS |
| `aria-beta` | BNII-Beta | CodeBuild + ECS |
| `aria-prod` | BNII-Production | CodeBuild + ECS |

Keys in each secret: `NEXT_PUBLIC_COGNITO_*`, `NEXT_PUBLIC_WEB_URL`, `ARIA_PUBLIC_URL`,
`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DATABASE_URL`, `BEDROCK_*`.

RDS also keeps its own AWS-managed secret (`rds!cluster-...`) — do not delete that.

## Files

```
infra/
├── cloudformation/aria-stack.yaml   # Full stack template
├── environments/accounts.json       # Account mapping
├── ecs-task-definition.template.json
├── codepipeline.template.json
└── README.md
scripts/
├── setup-aws-env.sh                 # Deploy CloudFormation
├── bootstrap-local-env.sh           # Generate local .env
└── configure-aws-profiles.sh        # Profile setup guide
```
