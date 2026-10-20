import { randomUUID } from "node:crypto";
import { ServiceError } from "./errors";
import { requireWorkspace } from "./request-context";
import { readJson } from "./handlers";
import { ConditionFailed, notExists, type Item, type Key } from "./store/types";
import type { Services } from "./services";

const noStore = { "Cache-Control": "no-store" };
const projectKey = (workspaceId: string, id: string): Key => ({ pk: `WS#${workspaceId}`, sk: `PROJECT#${id}` });
const memberKey = (workspaceId: string, userId: string): Key => ({ pk: `WS#${workspaceId}`, sk: `MEMBER#${userId}` });

function nameFrom(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 80) throw new ServiceError("invalid_project_name", 400);
  return value.trim();
}

function projectFrom(row: Item) {
  return { id: String(row.id), name: String(row.name), createdAt: Number(row.createdAt) };
}

function projectId(request: Request) {
  const id = new URL(request.url).pathname.split("/").filter(Boolean).at(-1);
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new ServiceError("project_not_found", 404);
  return id;
}

export async function projectsGetHandler(request: Request, services: Services) {
  const ctx = await requireWorkspace(request, services, "chat");
  const rows = await services.store.query(`WS#${ctx.workspace.id}`, "PROJECT#");
  return Response.json({ projects: rows.map(projectFrom).sort((a, b) => b.createdAt - a.createdAt) }, { headers: noStore });
}

export async function projectsPostHandler(request: Request, services: Services) {
  const ctx = await requireWorkspace(request, services, "chat");
  const body = await readJson(request);
  const name = nameFrom(body.name);
  const id = randomUUID();
  const createdAt = Date.now();
  try {
    await services.store.transact([
      { kind: "check", key: memberKey(ctx.workspace.id, ctx.user.id), when: [{ field: "status", op: "=", value: "active" }] },
      { kind: "put", when: [notExists], item: { ...projectKey(ctx.workspace.id, id), id, name, createdAt, createdBy: ctx.user.id } },
    ]);
  } catch (error) {
    if (error instanceof ConditionFailed) throw new ServiceError("access_revoked", 403);
    throw error;
  }
  return Response.json({ project: { id, name, createdAt } }, { status: 201, headers: noStore });
}

export async function projectPatchHandler(request: Request, services: Services) {
  const ctx = await requireWorkspace(request, services, "chat");
  const id = projectId(request);
  const name = nameFrom((await readJson(request)).name);
  try {
    await services.store.transact([
      { kind: "check", key: memberKey(ctx.workspace.id, ctx.user.id), when: [{ field: "status", op: "=", value: "active" }] },
      { kind: "update", key: projectKey(ctx.workspace.id, id), set: { name }, when: [{ field: "pk", op: "exists" }] },
    ]);
  } catch (error) {
    if (error instanceof ConditionFailed) throw new ServiceError(error.failedIndexes.includes(0) ? "access_revoked" : "project_not_found", error.failedIndexes.includes(0) ? 403 : 404);
    throw error;
  }
  return Response.json({ project: { id, name } }, { headers: noStore });
}

export async function projectDeleteHandler(request: Request, services: Services) {
  const ctx = await requireWorkspace(request, services, "chat");
  const id = projectId(request);
  try {
    await services.store.transact([
      { kind: "check", key: memberKey(ctx.workspace.id, ctx.user.id), when: [{ field: "status", op: "=", value: "active" }] },
      { kind: "delete", key: projectKey(ctx.workspace.id, id), when: [{ field: "pk", op: "exists" }] },
    ]);
  } catch (error) {
    if (error instanceof ConditionFailed) throw new ServiceError(error.failedIndexes.includes(0) ? "access_revoked" : "project_not_found", error.failedIndexes.includes(0) ? 403 : 404);
    throw error;
  }
  return Response.json({ ok: true }, { headers: noStore });
}
