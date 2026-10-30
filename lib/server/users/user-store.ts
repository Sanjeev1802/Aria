import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";
import {
  DEFAULT_SIGNUP_ROLE,
  isGlobalUserRole,
  type GlobalUserRole,
} from "./types";

export type UserRow = {
  id: string;
  email: string;
  name: string;
  role: GlobalUserRole;
};

export interface UserStore {
  /** When false, role checks are skipped so legacy tests work without a database. */
  readonly enforcesRoles: boolean;
  ensureUser(input: { id: string; email: string; name: string }): Promise<GlobalUserRole>;
  getRole(id: string): Promise<GlobalUserRole | undefined>;
  setRole(id: string, role: GlobalUserRole): Promise<void>;
  getUser(id: string): Promise<UserRow | undefined>;
}

const SQLITE_MIGRATION_SQL = readFileSync(
  join(process.cwd(), "db/migrations/001_users.sqlite.sql"),
  "utf8",
);
const POSTGRES_MIGRATION_SQL = readFileSync(
  join(process.cwd(), "db/migrations/001_users.postgres.sql"),
  "utf8",
);

function execSqliteMigration(db: DatabaseSync) {
  for (const statement of SQLITE_MIGRATION_SQL.split(";").map(s => s.trim()).filter(Boolean)) {
    db.exec(statement);
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseRole(value: unknown): GlobalUserRole | undefined {
  return isGlobalUserRole(value) ? value : undefined;
}

/** Used when ARIA_DATABASE_URL is unset; keeps legacy behavior (implicit member, no enforcement). */
export class NoopUserStore implements UserStore {
  readonly enforcesRoles = false;
  async ensureUser() {
    return DEFAULT_SIGNUP_ROLE;
  }
  async getRole() {
    return undefined;
  }
  async setRole() {}
  async getUser() {
    return undefined;
  }
}

export class SqliteUserStore implements UserStore {
  readonly enforcesRoles = true;
  private readonly db: DatabaseSync;

  constructor(sqlitePath: string) {
    mkdirSync(dirname(sqlitePath), { recursive: true });
    this.db = new DatabaseSync(sqlitePath);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA busy_timeout = 5000;");
    execSqliteMigration(this.db);
  }

  async ensureUser(input: { id: string; email: string; name: string }) {
    const email = normalizeEmail(input.email);
    const existing = this.db.prepare("SELECT role FROM users WHERE id = ?").get(input.id) as { role: string } | undefined;
    if (existing) {
      const role = parseRole(existing.role);
      if (role) return role;
    }
    this.db.prepare(
      `INSERT INTO users (id, email, name, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         name = excluded.name,
         updated_at = datetime('now')`,
    ).run(input.id, email, input.name.trim() || email.split("@")[0] || "ARIA user", DEFAULT_SIGNUP_ROLE);
    return DEFAULT_SIGNUP_ROLE;
  }

  async getRole(id: string) {
    const row = this.db.prepare("SELECT role FROM users WHERE id = ?").get(id) as { role: string } | undefined;
    return row ? parseRole(row.role) : undefined;
  }

  async setRole(id: string, role: GlobalUserRole) {
    this.db.prepare(
      "UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?",
    ).run(role, id);
  }

  async getUser(id: string) {
    const row = this.db.prepare("SELECT id, email, name, role FROM users WHERE id = ?").get(id) as
      | { id: string; email: string; name: string; role: string }
      | undefined;
    if (!row) return undefined;
    const role = parseRole(row.role);
    if (!role) return undefined;
    return { id: row.id, email: row.email, name: row.name, role };
  }
}

export class PgUserStore implements UserStore {
  readonly enforcesRoles = true;
  private pool: pg.Pool;
  private ready: Promise<void>;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString, max: 10 });
    this.ready = this.pool.query(POSTGRES_MIGRATION_SQL).then(() => undefined);
  }

  private migrate() {
    return this.ready;
  }

  async ensureUser(input: { id: string; email: string; name: string }) {
    await this.migrate();
    const email = normalizeEmail(input.email);
    const name = input.name.trim() || email.split("@")[0] || "ARIA user";
    const existing = await this.pool.query<{ role: string }>(
      "SELECT role FROM users WHERE id = $1",
      [input.id],
    );
    if (existing.rows[0]) {
      const role = parseRole(existing.rows[0].role);
      if (role) {
        await this.pool.query(
          "UPDATE users SET email = $2, name = $3, updated_at = NOW() WHERE id = $1",
          [input.id, email, name],
        );
        return role;
      }
    }
    await this.pool.query(
      `INSERT INTO users (id, email, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         name = EXCLUDED.name,
         updated_at = NOW()`,
      [input.id, email, name, DEFAULT_SIGNUP_ROLE],
    );
    return DEFAULT_SIGNUP_ROLE;
  }

  async getRole(id: string) {
    await this.migrate();
    const result = await this.pool.query<{ role: string }>(
      "SELECT role FROM users WHERE id = $1",
      [id],
    );
    return result.rows[0] ? parseRole(result.rows[0].role) : undefined;
  }

  async setRole(id: string, role: GlobalUserRole) {
    await this.migrate();
    await this.pool.query(
      "UPDATE users SET role = $2, updated_at = NOW() WHERE id = $1",
      [id, role],
    );
  }

  async getUser(id: string) {
    await this.migrate();
    const result = await this.pool.query<{ id: string; email: string; name: string; role: string }>(
      "SELECT id, email, name, role FROM users WHERE id = $1",
      [id],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    const role = parseRole(row.role);
    if (!role) return undefined;
    return { id: row.id, email: row.email, name: row.name, role };
  }
}

export function createUserStore(options: {
  databaseUrl?: string;
  sqlitePath?: string;
}): UserStore {
  if (options.databaseUrl) return new PgUserStore(options.databaseUrl);
  if (options.sqlitePath) return new SqliteUserStore(options.sqlitePath);
  return new NoopUserStore();
}
