import type { GlobalUserRole } from "./types";
import type { UserRow, UserStore } from "./user-store";
import { NoopUserStore, PgUserStore, SqliteUserStore } from "./user-store";

/** Resolves Aurora URL asynchronously (Secrets Manager) then delegates to PgUserStore. */
export class LazyUserStore implements UserStore {
  readonly enforcesRoles = true;
  private delegate: Promise<UserStore>;

  constructor(
    resolveUrl: () => Promise<string | undefined>,
    sqliteFallbackPath?: string,
  ) {
    this.delegate = resolveUrl().then(async url => {
      if (url) {
        const pg = new PgUserStore(url);
        try {
          await pg.getRole("__connectivity_probe__");
          return pg;
        } catch {
          if (sqliteFallbackPath) return new SqliteUserStore(sqliteFallbackPath);
          throw new Error("ARIA database is unreachable and no local SQLite fallback is configured");
        }
      }
      if (sqliteFallbackPath) return new SqliteUserStore(sqliteFallbackPath);
      return new NoopUserStore();
    });
  }

  private async store() {
    return this.delegate;
  }

  ensureUser(input: { id: string; email: string; name: string }) {
    return this.store().then(s => s.ensureUser(input));
  }

  getRole(id: string) {
    return this.store().then(s => s.getRole(id));
  }

  setRole(id: string, role: GlobalUserRole) {
    return this.store().then(s => s.setRole(id, role));
  }

  getUser(id: string) {
    return this.store().then(s => s.getUser(id));
  }
}
