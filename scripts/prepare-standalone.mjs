import { cpSync, existsSync, mkdirSync } from "node:fs";

mkdirSync(".next/standalone/.next", { recursive: true });
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
if (existsSync("public")) cpSync("public", ".next/standalone/public", { recursive: true });
// Aurora drivers read SQL migrations from disk at runtime (see lib/server/store/pg-store.ts).
if (existsSync("db/migrations")) {
  cpSync("db/migrations", ".next/standalone/db/migrations", { recursive: true });
}
