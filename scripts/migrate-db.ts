/**
 * Apply Aurora PostgreSQL migrations (users + store_items).
 *
 *   ARIA_DATABASE_URL='postgresql://...' npm run db:migrate
 *   AWS_PROFILE=... ARIA_DATABASE_SECRET_ARN=... npm run db:migrate
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { resolveDatabaseUrl } from "../lib/server/secrets/database-url";

async function main() {
  const url = await resolveDatabaseUrl(process.env);
  if (!url) throw new Error("Set ARIA_DATABASE_URL or ARIA_DATABASE_SECRET_ARN");
  const files = ["001_users.postgres.sql", "002_store.postgres.sql"];
  const pool = new pg.Pool({ connectionString: url });
  try {
    for (const file of files) {
      const sql = readFileSync(join(process.cwd(), "db/migrations", file), "utf8");
      await pool.query(sql);
      console.log(`applied ${file}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
