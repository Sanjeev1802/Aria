import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionFailed, type Comparison, type Condition, type IndexName, type Item, type Key, type Scalar, type Store, type Write } from "./types";

/**
 * Single-table DynamoDB driver. Table: pk (S) / sk (S); GSIs `gsi1` (gsi1pk, gsi1sk)
 * and `gsi2` (gsi2pk, gsi2sk); TTL attribute `ttl`. See infra/dynamodb-table.json.
 */
export class DynamoStore implements Store {
  private doc: DynamoDBDocumentClient;
  constructor(private table: string, options: { region?: string; endpoint?: string; client?: DynamoDBClient } = {}) {
    const client = options.client ?? new DynamoDBClient({ region: options.region, endpoint: options.endpoint });
    this.doc = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
  }

  async get(key: Key) {
    const result = await this.doc.send(new GetCommand({ TableName: this.table, Key: key, ConsistentRead: true }));
    return result.Item as Item | undefined;
  }

  async query(pk: string, skPrefix: string, options: { limit?: number } = {}) {
    return this.paginate({
      TableName: this.table, ConsistentRead: true,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: { ":pk": pk, ":prefix": skPrefix },
    }, options.limit);
  }

  async queryIndex(index: IndexName, pk: string, options: { limit?: number; skBefore?: string } = {}) {
    const before = options.skBefore !== undefined;
    return this.paginate({
      TableName: this.table, IndexName: index,
      KeyConditionExpression: `${index}pk = :pk${before ? ` AND ${index}sk < :before` : ""}`,
      ExpressionAttributeValues: { ":pk": pk, ...(before ? { ":before": options.skBefore } : {}) },
    }, options.limit);
  }

  private async paginate(input: ConstructorParameters<typeof QueryCommand>[0], limit?: number) {
    const rows: Item[] = [];
    let start: Record<string, unknown> | undefined;
    do {
      const page = await this.doc.send(new QueryCommand({ ...input, ExclusiveStartKey: start, Limit: limit }));
      rows.push(...(page.Items ?? []) as Item[]);
      start = page.LastEvaluatedKey;
    } while (start && (!limit || rows.length < limit));
    return limit ? rows.slice(0, limit) : rows;
  }

  async transact(writes: Write[]) {
    const input = { TransactItems: toTransactItems(this.table, writes) };
    for (let attempt = 0; ; attempt++) {
      try { await this.doc.send(new TransactWriteCommand(input)); return; }
      catch (error) {
        const reasons = (error as { CancellationReasons?: { Code?: string }[] }).CancellationReasons;
        if ((error as Error).name !== "TransactionCanceledException" || !reasons) throw error;
        const failed = reasons.flatMap((r, i) => r.Code === "ConditionalCheckFailed" ? [i] : []);
        if (failed.length) throw new ConditionFailed(failed);
        const conflict = reasons.some(r => r.Code === "TransactionConflict");
        if (!conflict || attempt >= 3) throw error;
        await new Promise(r => setTimeout(r, 25 * 2 ** attempt + Math.random() * 25));
      }
    }
  }
}

class Expr {
  names: Record<string, string> = {};
  values: Record<string, Scalar> = {};
  private n = 0;
  name(field: string) { const k = `#n${this.n++}`; this.names[k] = field; return k; }
  value(v: Scalar) { const k = `:v${this.n++}`; this.values[k] = v; return k; }
  comparison(c: Comparison) {
    if (!("value" in c)) return `${c.op === "exists" ? "attribute_exists" : "attribute_not_exists"}(${this.name(c.field)})`;
    return `${this.name(c.field)} ${c.op} ${this.value(c.value)}`;
  }
  condition(conditions?: Condition[]) {
    if (!conditions?.length) return undefined;
    return conditions.map(c => "any" in c ? `(${c.any.map(x => this.comparison(x)).join(" OR ")})` : this.comparison(c)).join(" AND ");
  }
  attach<T extends object>(target: T) {
    return {
      ...target,
      ...(Object.keys(this.names).length ? { ExpressionAttributeNames: this.names } : {}),
      ...(Object.keys(this.values).length ? { ExpressionAttributeValues: this.values } : {}),
    };
  }
}

export function toTransactItems(table: string, writes: Write[]) {
  return writes.map(w => {
    const e = new Expr();
    if (w.kind === "put") return { Put: e.attach({ TableName: table, Item: w.item, ConditionExpression: e.condition(w.when) }) };
    if (w.kind === "delete") return { Delete: e.attach({ TableName: table, Key: w.key, ConditionExpression: e.condition(w.when) }) };
    if (w.kind === "check") return { ConditionCheck: e.attach({ TableName: table, Key: w.key, ConditionExpression: e.condition(w.when)! }) };
    const clauses: string[] = [];
    const set = Object.entries(w.set ?? {}).map(([f, v]) => `${e.name(f)} = ${e.value(v)}`);
    const add = Object.entries(w.add ?? {}).map(([f, v]) => `${e.name(f)} ${e.value(v)}`);
    const remove = (w.remove ?? []).map(f => e.name(f));
    if (set.length) clauses.push(`SET ${set.join(", ")}`);
    if (add.length) clauses.push(`ADD ${add.join(", ")}`);
    if (remove.length) clauses.push(`REMOVE ${remove.join(", ")}`);
    const condition = e.condition(w.when);
    return { Update: e.attach({ TableName: table, Key: w.key, UpdateExpression: clauses.join(" "), ConditionExpression: condition }) };
  });
}
