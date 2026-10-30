import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { MemoryStore } from "../lib/server/store/memory-store";
import { AccountDirectory } from "../lib/server/accounts/directory";
import { CreditLedger } from "../lib/server/accounting/credit-ledger";
import { SqliteUserStore } from "../lib/server/users/user-store";
import { identity } from "./helpers";

test("ensureAccount registers member in the users table", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aria-users-"));
  const userStore = new SqliteUserStore(join(dir, "roles.sqlite"));
  const store = new MemoryStore();
  const directory = new AccountDirectory(store, Date.now, undefined, userStore);
  const user = identity("owner-1", { email: "owner@example.com", name: "Owner" });
  await directory.ensureAccount(user);
  assert.equal(await userStore.getRole(user.sub), "member");
});

test("Team plan entitlement promotes workspace owner to team_admin", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aria-users-"));
  const userStore = new SqliteUserStore(join(dir, "roles.sqlite"));
  const store = new MemoryStore();
  const ledger = new CreditLedger(store);
  const directory = new AccountDirectory(store, Date.now, undefined, userStore);
  const owner = identity("buyer-1", { email: "buyer@example.com" });
  await directory.ensureAccount(owner);
  const workspaceId = (await directory.getUser(owner.sub))!.personalWorkspaceId;
  await directory.applyEntitlement(ledger, workspaceId, {
    plan: "team",
    eventId: "evt_team_1",
    occurredAt: Date.now(),
  });
  assert.equal(await userStore.getRole(owner.sub), "team_admin");
});

test("team_admin invites; accept sets team_member", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aria-users-"));
  const userStore = new SqliteUserStore(join(dir, "roles.sqlite"));
  const store = new MemoryStore();
  const directory = new AccountDirectory(store, Date.now, undefined, userStore);
  const owner = identity("admin-1", { email: "admin@example.com" });
  const invitee = identity("member-1", { email: "member@example.com" });
  await directory.ensureAccount(owner);
  await directory.ensureAccount(invitee);
  const workspaceId = (await directory.getUser(owner.sub))!.personalWorkspaceId;
  await store.transact([
    { kind: "update", key: { pk: `WS#${workspaceId}`, sk: "META" }, set: { plan: "team", seatLimit: 5 } },
  ]);
  await userStore.setRole(owner.sub, "team_admin");
  const actor = {
    workspaceId,
    userId: owner.sub,
    role: "owner" as const,
    email: owner.email,
    name: owner.name,
  };
  const { token } = await directory.invite(actor, "member@example.com");
  await directory.acceptInvite(invitee, (await directory.getUser(invitee.sub))!, token);
  assert.equal(await userStore.getRole(invitee.sub), "team_member");
});

test("member global role cannot invite when roles are enforced", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aria-users-"));
  const userStore = new SqliteUserStore(join(dir, "roles.sqlite"));
  const store = new MemoryStore();
  const directory = new AccountDirectory(store, Date.now, undefined, userStore);
  const owner = identity("plain-1", { email: "plain@example.com" });
  await directory.ensureAccount(owner);
  const workspaceId = (await directory.getUser(owner.sub))!.personalWorkspaceId;
  await store.transact([
    { kind: "update", key: { pk: `WS#${workspaceId}`, sk: "META" }, set: { plan: "team", seatLimit: 5 } },
  ]);
  const actor = {
    workspaceId,
    userId: owner.sub,
    role: "owner" as const,
    email: owner.email,
    name: owner.name,
  };
  await assert.rejects(
    () => directory.invite(actor, "someone@example.com"),
    (error: { code?: string }) => error.code === "team_admin_required",
  );
});
