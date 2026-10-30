/**
 * Writes aria/dev/database in Secrets Manager from the aria-users-db CloudFormation stack.
 *
 *   AWS_PROFILE=bnii-development AWS_REGION=ap-southeast-1 npx tsx scripts/sync-database-secret.ts
 */
import {
  CreateSecretCommand,
  GetSecretValueCommand,
  PutSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";

const REGION = process.env.AWS_REGION || "ap-southeast-1";
const STACK = process.env.ARIA_USERS_STACK || "aria-users-dev";
const APP_SECRET = process.env.ARIA_DATABASE_SECRET_NAME || "aria/dev/database";

async function main() {
  const cfn = new CloudFormationClient({ region: REGION });
  const sm = new SecretsManagerClient({ region: REGION });
  const stack = await cfn.send(new DescribeStacksCommand({ StackName: STACK }));
  const outputs = Object.fromEntries(
    (stack.Stacks?.[0]?.Outputs ?? []).map(o => [o.OutputKey!, o.OutputValue!]),
  );
  const host = outputs.ClusterEndpoint;
  const port = outputs.ClusterPort || "5432";
  const dbname = outputs.DatabaseName || "aria";
  const masterArn = outputs.MasterSecretArn;
  if (!host || !masterArn) throw new Error(`Stack ${STACK} missing ClusterEndpoint or MasterSecretArn`);

  const master = await sm.send(new GetSecretValueCommand({ SecretId: masterArn }));
  const creds = JSON.parse(master.SecretString!) as { username: string; password: string };
  const url = `postgresql://${encodeURIComponent(creds.username)}:${encodeURIComponent(creds.password)}@${host}:${port}/${dbname}`;
  const payload = JSON.stringify({
    username: creds.username,
    password: creds.password,
    host,
    port: Number(port),
    dbname,
    url,
  });

  try {
    await sm.send(new PutSecretValueCommand({ SecretId: APP_SECRET, SecretString: payload }));
    console.log(`Updated secret ${APP_SECRET}`);
  } catch (error: unknown) {
    const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
    if (name !== "ResourceNotFoundException") throw error;
    const created = await sm.send(new CreateSecretCommand({
      Name: APP_SECRET,
      Description: "ARIA Aurora PostgreSQL connection for global user roles",
      SecretString: payload,
    }));
    console.log(`Created secret ${APP_SECRET}: ${created.ARN}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
