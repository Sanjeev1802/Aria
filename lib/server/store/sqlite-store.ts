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

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA busy_timeout = 5000;");
    this.db.exec(`CREATE TABLE IF NOT EXISTS items (
      pk TEXT NOT NULL,
      sk TEXT NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY (pk, sk)
    )`);
  }

  private loadAll() {
    const items = new Map<string, Item>();
    for (const row of this.db.prepare("SELECT data FROM items").all() as { data: string }[]) {
      const item = JSON.parse(row.data) as Item;
      items.set(itemKey(item), item);
    }
    return items;
  }

  async get(key: Key) {
    const item = this.loadAll().get(itemKey(key));
    return item ? { ...item } : undefined;
  }

  async query(pk: string, skPrefix: string, options: { limit?: number } = {}) {
    const rows = [...this.loadAll().values()].filter(i => i.pk === pk && i.sk.startsWith(skPrefix))
      .sort((a, b) => a.sk.localeCompare(b.sk)).map(i => ({ ...i }));
    return options.limit ? rows.slice(0, options.limit) : rows;
  }

  async queryIndex(index: IndexName, pk: string, options: { limit?: number; skBefore?: string } = {}) {
    const pkField = `${index}pk`, skField = `${index}sk`;
    const rows = [...this.loadAll().values()]
      .filter(i => i[pkField] === pk && typeof i[skField] === "string")
      .filter(i => options.skBefore === undefined || String(i[skField]) < options.skBefore)
      .sort((a, b) => String(a[skField]).localeCompare(String(b[skField]))).map(i => ({ ...i }));
    return options.limit ? rows.slice(0, options.limit) : rows;
  }

  async transact(writes: Write[]) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const next = this.loadAll();
      transactInMemory(next, writes);
      this.db.exec("DELETE FROM items");
      const insert = this.db.prepare("INSERT INTO items (pk, sk, data) VALUES (?, ?, ?)");
      for (const item of next.values()) insert.run(item.pk, item.sk, JSON.stringify(item));
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  /** Test helper: item count on disk. */
  size() { return this.loadAll().size; }
}
