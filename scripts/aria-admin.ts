/**
 * Operator commands against Aurora (store_items + users). Uses the AWS SDK default
 * credential chain when loading ARIA_DATABASE_SECRET_ARN. Run with:
 *   ARIA_DATABASE_URL='postgresql://...' npx tsx scripts/aria-admin.ts <command> ...
 *
 *   set-plan <workspaceId> <free|pro|team> <eventId>   Apply an entitlement (idempotent per eventId)
 *   reconcile [olderThanMinutes]                       Release holds left by crashed workers
 *   disable-user <userSub> | enable-user <userSub>     Block or restore an account
 *   revoke-sessions <userSub>                          Invalidate all of a user's tokens
 *   balance <workspaceId>                              Show the current period balance
 */
import { AccountDirectory } from "../lib/server/accounts/directory";
import { isPlanId } from "../lib/server/accounts/entitlements";
import { CreditLedger } from "../lib/server/accounting/credit-ledger";
import { resolveDatabaseUrl } from "../lib/server/secrets/database-url";
import { PgStore } from "../lib/server/store/pg-store";

async function main() {
  const url = await resolveDatabaseUrl(process.env);
  if (!url) throw new Error("Set ARIA_DATABASE_URL or ARIA_DATABASE_SECRET_ARN");
  const store = new PgStore(url);
  const directory = new AccountDirectory(store);
  const ledger = new CreditLedger(store);
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case "set-plan": {
      const [workspaceId, plan, eventId] = args;
      if (!workspaceId || !isPlanId(plan) || !eventId) throw new Error("Usage: set-plan <workspaceId> <free|pro|team> <eventId>");
      console.log(await directory.applyEntitlement(ledger, workspaceId, { plan, eventId, occurredAt: Date.now() }));
      break;
    }
    case "reconcile":
      console.log(await ledger.reconcile(args[0] ? { olderThanMs: Number(args[0]) * 60_000 } : {}));
      break;
    case "disable-user":
    case "enable-user":
      await directory.setUserStatus(args[0], command === "disable-user" ? "disabled" : "active");
      console.log("ok");
      break;
    case "revoke-sessions":
      await directory.revokeSessions(args[0]);
      console.log("ok");
      break;
    case "balance":
      console.log(await ledger.balance(args[0]));
      break;
    default:
      throw new Error("Unknown command. See the header of scripts/aria-admin.ts.");
  }
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
