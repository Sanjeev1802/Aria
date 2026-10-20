import test from "node:test";
import assert from "node:assert/strict";
import { DynamoStore, toTransactItems } from "../lib/server/store/dynamo-store";
import { ConditionFailed } from "../lib/server/store/types";

test("structured writes translate to DynamoDB condition and update expressions", () => {
  const [put, update, check] = toTransactItems("aria", [
    { kind: "put", item: { pk: "WS#1", sk: "REQ#a", n: 1 }, when: [{ field: "pk", op: "notExists" }] },
    { kind: "update", key: { pk: "WS#1", sk: "PERIOD#2026-10" }, set: { plan: "team" }, add: { reserved: 5, available: -5 },
      remove: ["gsi2pk"], when: [{ field: "available", op: ">=", value: 5 }, { any: [{ field: "x", op: "notExists" }, { field: "x", op: "<", value: 3 }] }] },
    { kind: "check", key: { pk: "WS#1", sk: "MEMBER#u" }, when: [{ field: "status", op: "=", value: "active" }] },
  ]) as Record<string, any>[];
  assert.equal(put.Put.ConditionExpression, "attribute_not_exists(#n0)");
  assert.deepEqual(put.Put.ExpressionAttributeNames, { "#n0": "pk" });
  assert.equal(update.Update.UpdateExpression, "SET #n0 = :v1 ADD #n2 :v3, #n4 :v5 REMOVE #n6");
  assert.equal(update.Update.ConditionExpression, "#n7 >= :v8 AND (attribute_not_exists(#n9) OR #n10 < :v11)");
  assert.deepEqual(update.Update.ExpressionAttributeValues, { ":v1": "team", ":v3": 5, ":v5": -5, ":v8": 5, ":v11": 3 });
  assert.equal(check.ConditionCheck.ConditionExpression, "#n0 = :v1");
  assert.equal(check.ConditionCheck.TableName, "aria");
});

function storeThatThrows(errors: unknown[]) {
  const store = new DynamoStore("aria", { region: "us-east-1" });
  let calls = 0;
  (store as unknown as { doc: { send: () => Promise<unknown> } }).doc = {
    send: async () => { const e = errors[calls++]; if (e) throw e; return {}; },
  };
  return { store, calls: () => calls };
}
const cancelled = (...codes: string[]) => Object.assign(new Error("cancelled"), {
  name: "TransactionCanceledException", CancellationReasons: codes.map(Code => ({ Code })),
});

test("cancellation reasons map to failed condition indexes", async () => {
  const { store } = storeThatThrows([cancelled("None", "ConditionalCheckFailed", "None")]);
  await assert.rejects(store.transact([{ kind: "check", key: { pk: "a", sk: "b" }, when: [{ field: "pk", op: "exists" }] }]),
    (e: unknown) => e instanceof ConditionFailed && e.failedIndexes.join() === "1");
});

test("transaction conflicts are retried a bounded number of times", async () => {
  const ok = storeThatThrows([cancelled("TransactionConflict"), cancelled("TransactionConflict")]);
  await ok.store.transact([{ kind: "delete", key: { pk: "a", sk: "b" } }]);
  assert.equal(ok.calls(), 3);
  const fails = storeThatThrows(Array(5).fill(cancelled("TransactionConflict")));
  await assert.rejects(fails.store.transact([{ kind: "delete", key: { pk: "a", sk: "b" } }]), { name: "TransactionCanceledException" });
  assert.equal(fails.calls(), 4);
});
