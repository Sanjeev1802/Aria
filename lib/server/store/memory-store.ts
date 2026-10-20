import type { IndexName, Item, Key, Store, Write } from "./types";
import { itemKey, transactInMemory } from "./transact-core";

/**
 * Atomic in-process store with DynamoDB-compatible condition semantics.
 * Used by tests and optional single-process development. Not durable.
 */
export class MemoryStore implements Store {
  private items = new Map<string, Item>();
  /** Optional latency injected before reads/commits to interleave concurrent workers. */
  delay?: () => Promise<void>;
  /** Runs before a transaction commits; throw to simulate a crash or network failure. */
  beforeCommit?: (writes: Write[]) => void | Promise<void>;

  private id(key: Key) { return itemKey(key); }
  private async pause() { if (this.delay) await this.delay(); }

  async get(key: Key) {
    await this.pause();
    const item = this.items.get(this.id(key));
    return item ? { ...item } : undefined;
  }

  async query(pk: string, skPrefix: string, options: { limit?: number } = {}) {
    await this.pause();
    const rows = [...this.items.values()].filter(i => i.pk === pk && i.sk.startsWith(skPrefix))
      .sort((a, b) => a.sk < b.sk ? -1 : a.sk > b.sk ? 1 : 0).map(i => ({ ...i }));
    return options.limit ? rows.slice(0, options.limit) : rows;
  }

  async queryIndex(index: IndexName, pk: string, options: { limit?: number; skBefore?: string } = {}) {
    await this.pause();
    const pkField = `${index}pk`, skField = `${index}sk`;
    const rows = [...this.items.values()]
      .filter(i => i[pkField] === pk && typeof i[skField] === "string")
      .filter(i => options.skBefore === undefined || String(i[skField]) < options.skBefore)
      .sort((a, b) => String(a[skField]).localeCompare(String(b[skField]))).map(i => ({ ...i }));
    return options.limit ? rows.slice(0, options.limit) : rows;
  }

  async transact(writes: Write[]) {
    await this.pause();
    if (this.beforeCommit) await this.beforeCommit(writes);
    transactInMemory(this.items, writes);
  }

  dump() { return [...this.items.values()].map(i => ({ ...i })); }
}
