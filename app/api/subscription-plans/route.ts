import { toPricingPlan } from "@/lib/aria-subscription-plans";
import { getPublishedSubscriptionPlans } from "@/lib/server/subscription-catalog";
import { run } from "@/lib/server/handlers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return run(request, async (_req, services) => {
    const published = await getPublishedSubscriptionPlans(services);
    return Response.json(
      { plans: published.map(toPricingPlan) },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );
  });
}
