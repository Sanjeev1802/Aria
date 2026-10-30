import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

type DatabaseSecret = {
  url?: string;
  username?: string;
  password?: string;
  host?: string;
  port?: number | string;
  dbname?: string;
  database?: string;
};

function buildPostgresUrl(parts: DatabaseSecret) {
  const user = parts.username;
  const password = parts.password;
  const host = parts.host;
  const port = parts.port ?? 5432;
  const db = parts.dbname ?? parts.database ?? "aria";
  if (!user || !password || !host) return undefined;
  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${db}`;
}

/** Direct URL wins; otherwise load JSON `{ url }` or `{ username, password, host, ... }` from Secrets Manager. */
export async function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): Promise<string | undefined> {
  const direct = env.ARIA_DATABASE_URL?.trim();
  if (direct) return direct;
  const secretId = env.ARIA_DATABASE_SECRET_ARN?.trim();
  if (!secretId) return undefined;
  const client = new SecretsManagerClient({ region: env.AWS_REGION || "us-east-1" });
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!response.SecretString) return undefined;
  const parsed = JSON.parse(response.SecretString) as DatabaseSecret;
  if (parsed.url?.trim()) return parsed.url.trim();
  return buildPostgresUrl(parsed);
}
