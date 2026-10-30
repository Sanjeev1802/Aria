import { ariaSubscriptionPlansList } from "@/lib/aria-subscription-plans";
import { hasFullAccess, requireInternalConsoleAdmin } from "@/lib/server/admin";
import { readJson, run } from "@/lib/server/handlers";
import { getSubscriptionCatalog, updateSubscriptionCatalog } from "@/lib/server/subscription-catalog";
import { ServiceError } from "@/lib/server/errors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return run(request, async (req, services) => {
    await requireInternalConsoleAdmin(req, services);
    const catalog = await getSubscriptionCatalog(services);
    return Response.json(
      {
        plans: ariaSubscriptionPlansList(catalog.plans),
        updatedAt: catalog.updatedAt,
        updatedBy: catalog.updatedBy,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}

export async function PUT(request: Request) {
  return run(request, async (req, services) => {
    const { user, internalRole, internalCanEdit } = await requireInternalConsoleAdmin(req, services);
    if (!hasFullAccess(internalRole, internalCanEdit)) {
      throw new ServiceError("admin_action_forbidden", 403);
    }
    const body = await readJson(req, 64_000);
    const result = await updateSubscriptionCatalog(services, user.id, body);
    return Response.json(
      {
        plans: ariaSubscriptionPlansList(result.plans),
        updatedAt: result.updatedAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
