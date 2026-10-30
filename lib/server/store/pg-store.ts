import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import type { IndexName, Item, Key, Store, Write } from "./types";
import { itemKey, transactInMemory, writeKey } from "./transact-core";

const MIGRATION_SQL = readFileSync(
  join(process.cwd(), "db/migrations/002_store.postgres.sql"),
  "utf8",
);

function gsiFromItem(item: Item) {
  return {
    gsi1pk: typeof item.gsi1pk === "string" ? item.gsi1pk : null,
    gsi1sk: typeof item.gsi1sk === "string" ? item.gsi1sk : null,
    gsi2pk: typeof item.gsi2pk === "string" ? item.gsi2pk : null,
    gsi2sk: typeof item.gsi2sk === "string" ? item.gsi2sk : null,
  };
}

function parseItem(raw: unknown): Item {
  return typeof raw === "string" ? (JSON.parse(raw) as Item) : (raw as Item);
}

/** Aurora PostgreSQL driver for the shared Store contract (ledger + directory items). */
export class PgStore implements Store {
  private pool: pg.Pool;
  private ready: Promise<void>;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString, max: 10 });
    this.ready = this.pool.query(MIGRATION_SQL).then(() => undefined);
  }

  private migrate() {
    return this.ready;
  }

  async get(key: Key) {
    await this.migrate();
    const result = await this.pool.query<{ data: Item }>(
      "SELECT data FROM store_items WHERE pk = $1 AND sk = $2",
      [key.pk, key.sk],
    );
    const row = result.rows[0];
    return row ? parseItem(row.data) : undefined;
  }

  async query(pk: string, skPrefix: string, options: { limit?: number } = {}) {
    await this.migrate();
    const limit = options.limit ?? 10_000;
    const result = await this.pool.query<{ data: Item }>(
      `SELECT data FROM store_items WHERE pk = $1 AND sk LIKE $2 ESCAPE '\\'
       ORDER BY sk LIMIT $3`,
      [pk, `${skPrefix.replace(/[%_\\]/g, ch => `\\${ch}`)}%`, limit],
    );
    return result.rows.map(r => parseItem(r.data));
  }

  async queryIndex(index: IndexName, pk: string, options: { limit?: number; skBefore?: string } = {}) {
    await this.migrate();
    const pkCol = `${index}pk`;
    const skCol = `${index}sk`;
    const limit = options.limit ?? 10_000;
    const result = options.skBefore !== undefined
      ? await this.pool.query<{ data: Item }>(
          `SELECT data FROM store_items WHERE ${pkCol} = $1 AND ${skCol} < $2 ORDER BY ${skCol} LIMIT $3`,
          [pk, options.skBefore, limit],
        )
      : await this.pool.query<{ data: Item }>(
          `SELECT data FROM store_items WHERE ${pkCol} = $1 ORDER BY ${skCol} LIMIT $2`,
          [pk, limit],
        );
    return result.rows.map(r => parseItem(r.data));
  }

  async transact(writes: Write[]) {
    await this.migrate();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const keys = [...new Set(writes.map(writeKey))];
      const items = new Map<string, Item>();
      for (const key of keys) {
        const [pk, sk] = key.split("\u0000");
        const row = await client.query<{ data: Item }>(
          "SELECT data FROM store_items WHERE pk = $1 AND sk = $2",
          [pk, sk],
        );
        if (row.rows[0]) items.set(key, parseItem(row.rows[0].data));
      }
      transactInMemory(items, writes);
      for (const write of writes) {
        const key = writeKey(write);
        if (write.kind === "delete") {
          const [pk, sk] = key.split("\u0000");
          await client.query("DELETE FROM store_items WHERE pk = $1 AND sk = $2", [pk, sk]);
          continue;
        }
        const item = items.get(key);
        if (!item) continue;
        const gsi = gsiFromItem(item);
        await client.query(
          `INSERT INTO store_items (pk, sk, data, gsi1pk, gsi1sk, gsi2pk, gsi2sk)
           VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)
           ON CONFLICT (pk, sk) DO UPDATE SET
             data = EXCLUDED.data,
             gsi1pk = EXCLUDED.gsi1pk,
             gsi1sk = EXCLUDED.gsi1sk,
             gsi2pk = EXCLUDED.gsi2pk,
             gsi2sk = EXCLUDED.gsi2sk`,
          [item.pk, item.sk, JSON.stringify(item), gsi.gsi1pk, gsi.gsi1sk, gsi.gsi2pk, gsi.gsi2sk],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /** Test helper: row count. */
  async size() {
    await this.migrate();
    const result = await this.pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM store_items");
    return Number(result.rows[0]?.count ?? 0);
  }
}
