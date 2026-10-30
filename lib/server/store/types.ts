/**
 * Minimal transactional key-value contract shared by the PostgreSQL/SQLite drivers and the
 * in-memory test driver. Conditions and updates are structured (not expression
 * strings) so all drivers enforce identical semantics.
 */
export type Scalar = string | number | boolean | null;
export type Key = { pk: string; sk: string };
export type Item = Key & Record<string, Scalar | undefined>;

export type Comparison =
  | { field: string; op: "=" | "<" | "<=" | ">" | ">="; value: Scalar }
  | { field: string; op: "exists" | "notExists" };
/** Top-level conditions are ANDed; `any` groups are ORed. */
export type Condition = Comparison | { any: Comparison[] };

export type Write =
  | { kind: "put"; item: Item; when?: Condition[] }
  | { kind: "update"; key: Key; set?: Record<string, Scalar>; add?: Record<string, number>; remove?: string[]; when?: Condition[] }
  | { kind: "delete"; key: Key; when?: Condition[] }
  | { kind: "check"; key: Key; when: Condition[] };

export type IndexName = "gsi1" | "gsi2";

export class ConditionFailed extends Error {
  constructor(public failedIndexes: number[]) { super("condition_failed"); }
}

export interface Store {
  /** Strongly consistent read. */
  get(key: Key): Promise<Item | undefined>;
  query(pk: string, skPrefix: string, options?: { limit?: number }): Promise<Item[]>;
  /** Eventually consistent in DynamoDB; re-read items before acting on them. */
  queryIndex(index: IndexName, pk: string, options?: { limit?: number; skBefore?: string }): Promise<Item[]>;
  /** All-or-nothing. Throws ConditionFailed with the indexes of failed conditions. */
  transact(writes: Write[]): Promise<void>;
}

export const notExists: Condition = { field: "pk", op: "notExists" };
export const exists: Condition = { field: "pk", op: "exists" };
