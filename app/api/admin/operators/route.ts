import { ServiceError } from "@/lib/server/errors";
import { grantOperator, listOperators, listSuperAdmins, requireInternalAdmin, revokeOperator } from "@/lib/server/admin";
import { readJson, run } from "@/lib/server/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/** Granting operator access is a super admin decision; every other role is denied. */
async function requireSuperAdmin(request: Request, services: Parameters<typeof requireInternalAdmin>[1]) {
  const ctx = await requireInternalAdmin(request, services);
  if (ctx.internalRole !== "super_admin") throw new ServiceError("admin_action_forbidden", 403);
  return ctx;
}

export async function GET(request: Request) {
  return run(request, async (req, services) => {
    const { user } = await requireSuperAdmin(req, services);
    return Response.json({ operators: await listOperators(services), superAdmins: await listSuperAdmins(services, user) }, { headers: noStore });
  });
}

export async function PUT(request: Request) {
  return run(request, async (req, services) => {
    const { user } = await requireSuperAdmin(req, services);
    const body = await readJson(req, 1_000);
    return Response.json({ operator: await grantOperator(services, user.id, body) }, { headers: noStore });
  });
}

export async function DELETE(request: Request) {
  return run(request, async (req, services) => {
    const { user } = await requireSuperAdmin(req, services);
    const body = await readJson(req, 1_000);
    await revokeOperator(services, user.id, body.email);
    return Response.json({ ok: true }, { headers: noStore });
  });
}
