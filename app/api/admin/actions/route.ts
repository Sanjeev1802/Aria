import { executeAdminAction, parseAdminAction, requireInternalAdmin } from "@/lib/server/admin";
import { readJson, run } from "@/lib/server/handlers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return run(request, async (req, services) => {
    const { user } = await requireInternalAdmin(req, services);
    const action = parseAdminAction(await readJson(req, 2_000));
    return Response.json(await executeAdminAction(services, user.id, action),
      { headers: { "Cache-Control": "no-store" } });
  });
}
