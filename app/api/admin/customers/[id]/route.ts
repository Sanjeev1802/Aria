import { adminCustomer, requireInternalAdmin } from "@/lib/server/admin";
import { run } from "@/lib/server/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return run(request, async (req, services) => {
    await requireInternalAdmin(req, services);
    const { id } = await context.params;
    return Response.json(await adminCustomer(services, id), { headers: { "Cache-Control": "no-store" } });
  });
}
