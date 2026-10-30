/**
 * Apply db/migrations/001_users.sql to Aurora (or any PostgreSQL URL).
 *
 *   ARIA_DATABASE_URL='postgresql://...' npx tsx scripts/migrate-users-db.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

async function main() {
  const url = process.env.ARIA_DATABASE_URL?.trim();
  if (!url) throw new Error("Set ARIA_DATABASE_URL");
  const sql = readFileSync(join(process.cwd(), "db/migrations/001_users.postgres.sql"), "utf8");
  const pool = new pg.Pool({ connectionString: url });
  try {
    await pool.query(sql);
    console.log("users migration applied");
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
