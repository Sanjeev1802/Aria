/**
 * One-off: delete Cognito pool users and Aurora `users` rows except one email;
 * set that user's role to super_admin in Postgres.
 *
 *   AWS_PROFILE=bnii-development AWS_REGION=ap-southeast-1 \\
 *   ARIA_COGNITO_USER_POOL_ID=... ARIA_DATABASE_SECRET_ARN=... \\
 *   npx tsx scripts/purge-users-except.ts sanjeev@thebinaryholdings.com --apply
 */
import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
  type UserType,
} from "@aws-sdk/client-cognito-identity-provider";
import pg from "pg";
import { resolveDatabaseUrl } from "../lib/server/secrets/database-url";

const KEEP_EMAIL = process.argv[2]?.trim().toLowerCase();
const apply = process.argv.includes("--apply");

function emailOf(user: UserType) {
  return user.Attributes?.find(a => a.Name === "email")?.Value?.trim().toLowerCase() ?? "";
}

async function main() {
  if (!KEEP_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(KEEP_EMAIL)) {
    throw new Error("Usage: npx tsx scripts/purge-users-except.ts <email> [--apply]");
  }
  const poolId = process.env.ARIA_COGNITO_USER_POOL_ID?.trim();
  const region = process.env.AWS_REGION || "ap-southeast-1";
  if (!poolId) throw new Error("Set ARIA_COGNITO_USER_POOL_ID");

  const cognito = new CognitoIdentityProviderClient({ region });
  const listed = await cognito.send(new ListUsersCommand({ UserPoolId: poolId, Limit: 60 }));
  const users = listed.Users ?? [];
  const keepCognito = users.filter(u => emailOf(u) === KEEP_EMAIL);
  const deleteCognito = users.filter(u => emailOf(u) && emailOf(u) !== KEEP_EMAIL);

  console.log("Cognito:", { total: users.length, keep: keepCognito.map(u => emailOf(u)), delete: deleteCognito.map(u => emailOf(u)) });

  const dbUrl = await resolveDatabaseUrl(process.env);
  let pgBefore: { id: string; email: string; role: string }[] = [];
  let pgAfter: { id: string; email: string; role: string }[] = [];
  if (dbUrl) {
    const pool = new pg.Pool({ connectionString: dbUrl, connectionTimeoutMillis: 20_000 });
    try {
      const before = await pool.query<{ id: string; email: string; role: string }>(
        "SELECT id, email, role FROM users ORDER BY email",
      );
      pgBefore = before.rows;
      console.log("Postgres before:", pgBefore);
      if (apply) {
        const del = await pool.query<{ id: string; email: string }>(
          "DELETE FROM users WHERE LOWER(email) <> LOWER($1) RETURNING id, email",
          [KEEP_EMAIL],
        );
        console.log("Postgres deleted:", del.rowCount, del.rows);
        const upsertSub = keepCognito[0]?.Username;
        if (upsertSub) {
          await pool.query(
            `INSERT INTO users (id, email, name, role)
             VALUES ($1, $2, $3, 'super_admin')
             ON CONFLICT (id) DO UPDATE SET
               email = EXCLUDED.email,
               role = 'super_admin',
               updated_at = NOW()`,
            [upsertSub, KEEP_EMAIL, KEEP_EMAIL.split("@")[0] || "ARIA user"],
          );
        } else {
          await pool.query(
            "UPDATE users SET role = 'super_admin', updated_at = NOW() WHERE LOWER(email) = LOWER($1)",
            [KEEP_EMAIL],
          );
        }
        const after = await pool.query<{ id: string; email: string; role: string }>(
          "SELECT id, email, role FROM users ORDER BY email",
        );
        pgAfter = after.rows;
        console.log("Postgres after:", pgAfter);
      }
    } finally {
      await pool.end();
    }
  } else {
    console.log("Postgres: skipped (no ARIA_DATABASE_URL / ARIA_DATABASE_SECRET_ARN)");
  }

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to delete Cognito users and mutate Postgres.");
    return;
  }

  for (const user of deleteCognito) {
    const username = user.Username;
    if (!username) continue;
    await cognito.send(new AdminDeleteUserCommand({ UserPoolId: poolId, Username: username }));
    console.log("Cognito deleted:", emailOf(user), username);
  }

  const remaining = await cognito.send(new ListUsersCommand({ UserPoolId: poolId, Limit: 60 }));
  console.log(
    "Cognito after:",
    (remaining.Users ?? []).map(u => ({ email: emailOf(u), sub: u.Username })),
  );
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
