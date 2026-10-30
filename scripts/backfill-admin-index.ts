/**
 * Backfill missing gsi2 admin discovery keys on PROFILE and workspace META rows in Aurora.
 *
 *   ARIA_DATABASE_URL='...' npm run admin:backfill
 *   ARIA_DATABASE_URL='...' npm run admin:backfill -- --apply
 */
import pg from "pg";
import { resolveDatabaseUrl } from "../lib/server/secrets/database-url";

async function main() {
  const url = await resolveDatabaseUrl(process.env);
  if (!url) throw new Error("Set ARIA_DATABASE_URL or ARIA_DATABASE_SECRET_ARN");
  const apply = process.argv.includes("--apply");
  const pool = new pg.Pool({ connectionString: url });
  try {
    const profiles = await pool.query<{ pk: string; sk: string; data: Record<string, unknown> }>(
      `SELECT pk, sk, data FROM store_items WHERE sk = 'PROFILE'`,
    );
    const workspaces = await pool.query<{ pk: string; sk: string; data: Record<string, unknown> }>(
      `SELECT pk, sk, data FROM store_items WHERE sk = 'META' AND pk LIKE 'WS#%'`,
    );
    let profileUpdates = 0;
    let workspaceUpdates = 0;
    for (const row of profiles.rows) {
      if (row.data.gsi2pk === "ADMIN#USERS") continue;
      profileUpdates++;
      if (apply) {
        const createdAt = Number(row.data.createdAt ?? Date.now());
        const sub = row.pk.replace(/^USER#/, "");
        const gsi2sk = `${String(createdAt).padStart(13, "0")}#${sub}`;
        const next = { ...row.data, gsi2pk: "ADMIN#USERS", gsi2sk };
        await pool.query(
          `UPDATE store_items SET data = $3::jsonb, gsi2pk = $4, gsi2sk = $5 WHERE pk = $1 AND sk = $2`,
          [row.pk, row.sk, JSON.stringify(next), "ADMIN#USERS", gsi2sk],
        );
      }
    }
    for (const row of workspaces.rows) {
      if (row.data.gsi2pk === "ADMIN#WORKSPACES") continue;
      workspaceUpdates++;
      if (apply) {
        const createdAt = Number(row.data.createdAt ?? Date.now());
        const workspaceId = String(row.data.workspaceId ?? row.pk.replace(/^WS#/, ""));
        const gsi2sk = `${String(createdAt).padStart(13, "0")}#${workspaceId}`;
        const next = { ...row.data, gsi2pk: "ADMIN#WORKSPACES", gsi2sk };
        await pool.query(
          `UPDATE store_items SET data = $3::jsonb, gsi2pk = $4, gsi2sk = $5 WHERE pk = $1 AND sk = $2`,
          [row.pk, row.sk, JSON.stringify(next), "ADMIN#WORKSPACES", gsi2sk],
        );
      }
    }
    console.log({ apply, profileUpdates, workspaceUpdates });
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
