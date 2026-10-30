import { ServiceError } from "../errors";
import type { IndexName, Item, Key, Store, Write } from "./types";
import { PgStore } from "./pg-store";
import { SqliteStore } from "./sqlite-store";

/** Resolves Aurora URL asynchronously, then delegates to PgStore (SQLite fallback in development). */
export class LazyPgStore implements Store {
  private delegate: Promise<Store>;

  constructor(
    resolveUrl: () => Promise<string | undefined>,
    sqliteFallbackPath?: string,
  ) {
    this.delegate = resolveUrl().then(async url => {
      if (url) {
        const pg = new PgStore(url);
        try {
          await pg.get({ pk: "__connectivity_probe__", sk: "__connectivity_probe__" });
          return pg;
        } catch {
          if (sqliteFallbackPath) return new SqliteStore(sqliteFallbackPath);
          throw new ServiceError("service_unavailable", 503);
        }
      }
      if (sqliteFallbackPath) return new SqliteStore(sqliteFallbackPath);
      throw new ServiceError("live_service_not_configured", 503);
    });
  }

  private store() {
    return this.delegate;
  }

  get(key: Key) {
    return this.store().then(s => s.get(key));
  }

  query(pk: string, skPrefix: string, options?: { limit?: number }) {
    return this.store().then(s => s.query(pk, skPrefix, options));
  }

  queryIndex(index: IndexName, pk: string, options?: { limit?: number; skBefore?: string }) {
    return this.store().then(s => s.queryIndex(index, pk, options));
  }

  transact(writes: Write[]) {
    return this.store().then(s => s.transact(writes));
  }
}
