import { adminModels, requireInternalAdmin } from "@/lib/server/admin";
import { run } from "@/lib/server/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return run(request, async (req, services) => {
    await requireInternalAdmin(req, services);
    return Response.json(await adminModels(services), { headers: { "Cache-Control": "no-store" } });
  });
}
