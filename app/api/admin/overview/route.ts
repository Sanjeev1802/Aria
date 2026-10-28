import { adminOverview, requireInternalAdmin } from "@/lib/server/admin";
import { run } from "@/lib/server/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return run(request, async (req, services) => {
    const { user, internalRole } = await requireInternalAdmin(req, services);
    return Response.json({ ...await adminOverview(services), internalRole, operatorId: user.id,
      operator: { name: user.name, email: user.email } }, { headers: { "Cache-Control": "no-store" } });
  });
}
