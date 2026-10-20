import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { IndexName, Item, Key, Store, Write } from "./types";
import { itemKey, transactInMemory } from "./transact-core";

/**
 * File-backed Store for local development. Uses the same transaction semantics as
 * MemoryStore; data survives process restarts.
 */
export class SqliteStore implements Store {
  private readonly db: DatabaseSync;
  private readonly cache = new Map<string, Item>();

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec(`CREATE TABLE IF NOT EXISTS items (
      pk TEXT NOT NULL,
      sk TEXT NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY (pk, sk)
    )`);
    this.loadAll();
  }

  private loadAll() {
    this.cache.clear();
    for (const row of this.db.prepare("SELECT data FROM items").all() as { data: string }[]) {
      const item = JSON.parse(row.data) as Item;
      this.cache.set(itemKey(item), item);
    }
  }

  private persist() {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.exec("DELETE FROM items");
      const insert = this.db.prepare("INSERT INTO items (pk, sk, data) VALUES (?, ?, ?)");
      for (const item of this.cache.values()) {
        insert.run(item.pk, item.sk, JSON.stringify(item));
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async get(key: Key) {
    const item = this.cache.get(itemKey(key));
    return item ? { ...item } : undefined;
  }

  async query(pk: string, skPrefix: string, options: { limit?: number } = {}) {
    const rows = [...this.cache.values()].filter(i => i.pk === pk && i.sk.startsWith(skPrefix))
      .sort((a, b) => a.sk.localeCompare(b.sk)).map(i => ({ ...i }));
    return options.limit ? rows.slice(0, options.limit) : rows;
  }

  async queryIndex(index: IndexName, pk: string, options: { limit?: number; skBefore?: string } = {}) {
    const pkField = `${index}pk`, skField = `${index}sk`;
    const rows = [...this.cache.values()]
      .filter(i => i[pkField] === pk && typeof i[skField] === "string")
      .filter(i => options.skBefore === undefined || String(i[skField]) < options.skBefore)
      .sort((a, b) => String(a[skField]).localeCompare(String(b[skField]))).map(i => ({ ...i }));
    return options.limit ? rows.slice(0, options.limit) : rows;
  }

  async transact(writes: Write[]) {
    transactInMemory(this.cache, writes);
    this.persist();
  }

  /** Test helper: item count on disk. */
  size() { return this.cache.size; }
}
