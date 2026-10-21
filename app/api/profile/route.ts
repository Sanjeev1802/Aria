import { run } from "@/lib/server/handlers";
import { profilePatchHandler } from "@/lib/server/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function PATCH(request: Request) {
  return run(request, profilePatchHandler);
}
