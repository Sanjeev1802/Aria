import { adminUsage, requireInternalAdmin } from "@/lib/server/admin";
import { run } from "@/lib/server/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return run(request, async (req, services) => {
    await requireInternalAdmin(req, services);
    const days = Number(new URL(req.url).searchParams.get("days") ?? 30);
    return Response.json(await adminUsage(services, days), { headers: { "Cache-Control": "no-store" } });
  });
}
