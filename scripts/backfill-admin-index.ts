/** Add the internal-console GSI keys to accounts created before the console existed.
 * Dry run by default. Use `npm run admin:backfill -- --apply` after reviewing the count.
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

async function main() {
  const table = process.env.ARIA_DYNAMODB_TABLE;
  if (!table) throw new Error("Set ARIA_DYNAMODB_TABLE");
  const apply = process.argv.includes("--apply");
  const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));
  let cursor: Record<string, unknown> | undefined;
  let found = 0;
  let updated = 0;
  do {
    const page = await doc.send(new ScanCommand({ TableName: table, ExclusiveStartKey: cursor,
      ProjectionExpression: "pk, sk, createdAt, gsi2pk",
      FilterExpression: "(begins_with(pk, :user) AND sk = :profile) OR (begins_with(pk, :workspace) AND sk = :meta)",
      ExpressionAttributeValues: { ":user": "USER#", ":profile": "PROFILE", ":workspace": "WS#", ":meta": "META" } }));
    for (const row of page.Items ?? []) {
      if (typeof row.pk !== "string" || typeof row.sk !== "string" || row.gsi2pk) continue;
      const user = row.pk.startsWith("USER#") && row.sk === "PROFILE";
      const workspace = row.pk.startsWith("WS#") && row.sk === "META";
      if (!user && !workspace) continue;
      found++;
      if (!apply) continue;
      const createdAt = Number.isSafeInteger(row.createdAt) ? row.createdAt : 0;
      const pk = user ? "ADMIN#USERS" : "ADMIN#WORKSPACES";
      const sk = `${String(createdAt).padStart(13, "0")}#${row.pk.slice(user ? 5 : 3)}`;
      try {
        await doc.send(new UpdateCommand({ TableName: table, Key: { pk: row.pk, sk: row.sk },
          UpdateExpression: "SET gsi2pk = :indexPk, gsi2sk = :indexSk",
          ConditionExpression: "attribute_exists(pk) AND attribute_not_exists(gsi2pk)",
          ExpressionAttributeValues: { ":indexPk": pk, ":indexSk": sk } }));
        updated++;
      } catch (error) {
        if ((error as Error).name !== "ConditionalCheckFailedException") throw error;
      }
    }
    cursor = page.LastEvaluatedKey;
  } while (cursor);
  console.log(JSON.stringify({ mode: apply ? "applied" : "dry-run", eligible: found, updated }));
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
