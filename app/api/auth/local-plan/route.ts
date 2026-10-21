import { run } from "@/lib/server/handlers";
import { localPlanHandler } from "@/lib/server/local-plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return run(request, localPlanHandler);
}
