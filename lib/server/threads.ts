import { randomUUID } from "node:crypto";
import { ServiceError } from "./errors";
import { readJson } from "./handlers";
import { requireWorkspace, type WorkspaceContext } from "./request-context";
import type { ChatInput } from "./chat-input";
import type { Services } from "./services";
import { ConditionFailed, notExists, type Item, type Key } from "./store/types";

type SavedMessage = { id: string; role: "user" | "assistant"; content: string };
type SavedThread = { id: string; title: string; createdAt: string; messages: SavedMessage[]; version: number; lastRunId?: string; projectId?: string };
const noStore = { "Cache-Control": "no-store" };
const validId = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
const pk = (ctx: WorkspaceContext) => `CHAT#${ctx.workspace.id}#${ctx.user.id}`;
const key = (ctx: WorkspaceContext, id: string): Key => ({ pk: pk(ctx), sk: `THREAD#${id}` });
const memberKey = (ctx: WorkspaceContext): Key => ({ pk: `WS#${ctx.workspace.id}`, sk: `MEMBER#${ctx.user.id}` });
const projectKey = (ctx: WorkspaceContext, id: string): Key => ({ pk: `WS#${ctx.workspace.id}`, sk: `PROJECT#${id}` });
const threadId = (request: Request) => {
  const id = new URL(request.url).pathname.split("/").filter(Boolean).at(-1);
  if (!validId(id)) throw new ServiceError("thread_not_found", 404);
  return id;
};

function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.every(p => p?.type === "text" && typeof p.text === "string")) return value.map(p => p.text).join("\n");
  throw new ServiceError("invalid_message", 400);
}

function decode(row: Item | undefined): SavedThread {
  if (!row) throw new ServiceError("thread_not_found", 404);
  try {
    const messages = JSON.parse(String(row.messages));
    if (!Array.isArray(messages)) throw new Error();
    return { id: String(row.id), title: String(row.title), createdAt: String(row.createdAt), messages,
      version: Number(row.version ?? 0), lastRunId: typeof row.lastRunId === "string" ? row.lastRunId : undefined,
      projectId: validId(row.projectId) ? row.projectId : undefined };
  } catch { throw new ServiceError("thread_unavailable", 503); }
}

function exposed(thread: SavedThread, availableProjects?: ReadonlySet<string>) {
  const projectId = thread.projectId && (!availableProjects || availableProjects.has(thread.projectId)) ? thread.projectId : null;
  return { id: thread.id, title: thread.title, createdAt: thread.createdAt, projectId };
}

async function projectIds(services: Services, ctx: WorkspaceContext) {
  const rows = await services.store.query(`WS#${ctx.workspace.id}`, "PROJECT#");
  return new Set(rows.map(row => String(row.id)));
}

function exposedMessages(thread: SavedThread) {
  return thread.messages.map(m => ({ id: m.id, role: m.role,
    content: m.role === "assistant" ? `root = TextContent(${JSON.stringify(m.content)})` : m.content }));
}

export async function threadsGetHandler(request: Request, services: Services) {
  const ctx = await requireWorkspace(request, services, "chat");
  const rows = await services.store.query(pk(ctx), "THREAD#");
  const availableProjects = await projectIds(services, ctx);
  const threads = rows.map(row => exposed(decode(row), availableProjects)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return Response.json({ threads }, { headers: noStore });
}

export async function threadsPostHandler(request: Request, services: Services) {
  const ctx = await requireWorkspace(request, services, "chat");
  const body = await readJson(request, 16_000);
  const first = body.firstMessage;
  if (!first || typeof first !== "object" || Array.isArray(first)) throw new ServiceError("invalid_message", 400);
  const message = first as Record<string, unknown>;
  const content = textOf(message.content);
  if (message.role !== "user" || !content.trim() || Buffer.byteLength(content, "utf8") > 8000) throw new ServiceError("invalid_message", 400);
  const id = randomUUID(), createdAt = new Date().toISOString();
  const title = content.trim().slice(0, 80);
  const projectId = body.projectId === undefined ? undefined : body.projectId;
  if (projectId !== undefined && !validId(projectId)) throw new ServiceError("project_not_found", 404);
  const messages: SavedMessage[] = [{ id: typeof message.id === "string" && message.id.length <= 100 ? message.id : randomUUID(), role: "user", content }];
  try {
    await services.store.transact([
      { kind: "check", key: memberKey(ctx), when: [{ field: "status", op: "=", value: "active" }] },
      ...(projectId ? [{ kind: "check" as const, key: projectKey(ctx, projectId), when: [{ field: "pk" as const, op: "exists" as const }] }] : []),
      { kind: "put", when: [notExists], item: { ...key(ctx, id), id, title, createdAt, messages: JSON.stringify(messages), version: 0, projectId } },
    ]);
  } catch (error) {
    if (error instanceof ConditionFailed) throw new ServiceError(error.failedIndexes.includes(0) ? "access_revoked" : "project_not_found", error.failedIndexes.includes(0) ? 403 : 404);
    throw error;
  }
  return Response.json(exposed({ id, title, createdAt, messages, version: 0, projectId }), { status: 201, headers: noStore });
}

export async function threadGetHandler(request: Request, services: Services) {
  const ctx = await requireWorkspace(request, services, "chat");
  const thread = decode(await services.store.get(key(ctx, threadId(request))));
  if (new URL(request.url).searchParams.get("export") === "1") {
    return Response.json({ version: 1, thread: exposed(thread, await projectIds(services, ctx)), messages: thread.messages }, {
      headers: { ...noStore, "Content-Disposition": `attachment; filename="aria-chat-${thread.id}.json"` },
    });
  }
  return Response.json({ messages: exposedMessages(thread) }, { headers: noStore });
}

export async function threadPatchHandler(request: Request, services: Services) {
  const ctx = await requireWorkspace(request, services, "chat");
  const id = threadId(request);
  const body = await readJson(request);
  const hasTitle = Object.hasOwn(body, "title");
  const hasProject = Object.hasOwn(body, "projectId");
  if (!hasTitle && !hasProject) throw new ServiceError("invalid_request", 400);
  if (hasTitle && (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 120))
    throw new ServiceError("invalid_thread_title", 400);
  if (hasProject && body.projectId !== null && !validId(body.projectId)) throw new ServiceError("project_not_found", 404);
  const projectId = hasProject && body.projectId !== null ? body.projectId as string : undefined;
  try {
    await services.store.transact([
      { kind: "check", key: memberKey(ctx), when: [{ field: "status", op: "=", value: "active" }] },
      ...(projectId ? [{ kind: "check" as const, key: projectKey(ctx, projectId), when: [{ field: "pk" as const, op: "exists" as const }] }] : []),
      { kind: "update", key: key(ctx, id), set: {
        ...(hasTitle ? { title: (body.title as string).trim() } : {}),
        ...(projectId ? { projectId } : {}),
      }, remove: hasProject && !projectId ? ["projectId"] : undefined, when: [{ field: "pk", op: "exists" }] },
    ]);
  } catch (error) {
    if (error instanceof ConditionFailed) {
      if (error.failedIndexes.includes(0)) throw new ServiceError("access_revoked", 403);
      if (projectId && error.failedIndexes.includes(1)) throw new ServiceError("project_not_found", 404);
      throw new ServiceError("thread_not_found", 404);
    }
    throw error;
  }
  return Response.json(exposed(decode(await services.store.get(key(ctx, id))), await projectIds(services, ctx)), { headers: noStore });
}

export async function threadDeleteHandler(request: Request, services: Services) {
  const ctx = await requireWorkspace(request, services, "chat");
  const id = threadId(request);
  try {
    await services.store.transact([
      { kind: "check", key: memberKey(ctx), when: [{ field: "status", op: "=", value: "active" }] },
      { kind: "delete", key: key(ctx, id), when: [{ field: "pk", op: "exists" }] },
    ]);
  } catch (error) {
    if (error instanceof ConditionFailed) throw new ServiceError(error.failedIndexes.includes(0) ? "access_revoked" : "thread_not_found", error.failedIndexes.includes(0) ? 403 : 404);
    throw error;
  }
  return Response.json({ ok: true }, { headers: noStore });
}

/** A browser thread ID only selects data the authenticated user owns. */
export async function prepareThreadRun(services: Services, ctx: WorkspaceContext, id: unknown, input: ChatInput) {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) throw new ServiceError("thread_not_found", 404);
  const thread = decode(await services.store.get(key(ctx, id)));
  const history = thread.messages;
  const replay = thread.lastRunId === input.id && input.messages.length === history.length - 1;
  if (!replay && input.messages.length !== history.length && input.messages.length !== history.length + 1) throw new ServiceError("thread_history_conflict", 409);
  for (let i = 0; i < Math.min(history.length, input.messages.length); i++) {
    if (history[i].role !== input.messages[i].role || history[i].content !== input.messages[i].content[0].text)
      throw new ServiceError("thread_history_conflict", 409);
  }
  if (input.messages.at(-1)?.role !== "user") throw new ServiceError("thread_history_conflict", 409);
  return async (responseText: string) => {
    const current = decode(await services.store.get(key(ctx, id)));
    if (current.lastRunId === input.id) return;
    if (current.version !== thread.version) throw new ServiceError("thread_history_conflict", 409);
    const next = input.messages.map((m, i): SavedMessage => ({ id: history[i]?.id ?? randomUUID(), role: m.role, content: m.content[0].text }));
    next.push({ id: randomUUID(), role: "assistant", content: responseText });
    const serialized = JSON.stringify(next);
    if (Buffer.byteLength(serialized, "utf8") > 300_000) throw new ServiceError("thread_too_large", 413);
    await services.store.transact([
      { kind: "check", key: memberKey(ctx), when: [{ field: "status", op: "=", value: "active" }] },
      { kind: "update", key: key(ctx, id), set: { messages: serialized, version: thread.version + 1, lastRunId: input.id },
        when: [{ field: "version", op: "=", value: thread.version }] },
    ]);
  };
}
