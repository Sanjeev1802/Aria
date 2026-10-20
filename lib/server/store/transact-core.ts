import { ConditionFailed, type Comparison, type Condition, type Item, type Key, type Write } from "./types";

export function itemKey(key: Key) {
  return `${key.pk}\u0000${key.sk}`;
}

export function writeKey(write: Write) {
  return itemKey(write.kind === "put" ? write.item : write.key);
}

export function validateTransact(writes: Write[]) {
  if (!writes.length || writes.length > 100) throw new Error("Transactions need 1–100 writes");
  const keys = writes.map(writeKey);
  if (new Set(keys).size !== keys.length) throw new Error("A transaction cannot touch the same item twice");
}

export function failedConditionIndexes(items: Map<string, Item>, writes: Write[]) {
  const keys = writes.map(writeKey);
  return writes.flatMap((w, i) => (w.when ?? []).every(c => matches(items.get(keys[i]), c)) ? [] : [i]);
}

/** Applies writes after conditions pass; mutates `items` in place. */
export function applyWrites(items: Map<string, Item>, writes: Write[]) {
  const keys = writes.map(writeKey);
  writes.forEach((w, i) => {
    const current = items.get(keys[i]);
    if (w.kind === "put") items.set(keys[i], { ...w.item });
    else if (w.kind === "delete") items.delete(keys[i]);
    else if (w.kind === "update") {
      const next: Item = { ...(current ?? w.key) };
      for (const [f, v] of Object.entries(w.add ?? {})) {
        const prior = next[f] ?? 0;
        if (typeof prior !== "number") throw new Error(`Cannot add to non-number ${f}`);
        next[f] = prior + v;
      }
      Object.assign(next, w.set ?? {});
      for (const f of w.remove ?? []) delete next[f];
      items.set(keys[i], next);
    }
  });
}

export function transactInMemory(items: Map<string, Item>, writes: Write[]) {
  validateTransact(writes);
  const failed = failedConditionIndexes(items, writes);
  if (failed.length) throw new ConditionFailed(failed);
  applyWrites(items, writes);
}

function matches(item: Item | undefined, condition: Condition): boolean {
  if ("any" in condition) return condition.any.some(c => matches(item, c));
  return compare(item, condition);
}

function compare(item: Item | undefined, c: Comparison): boolean {
  const value = item?.[c.field];
  if (!("value" in c)) return c.op === "exists" ? value !== undefined : value === undefined;
  if (value === undefined || value === null || typeof value !== typeof c.value) return false;
  const a = value as string | number, b = c.value as string | number;
  switch (c.op) {
    case "=": return a === b;
    case "<": return a < b;
    case "<=": return a <= b;
    case ">": return a > b;
    case ">=": return a >= b;
  }
}
