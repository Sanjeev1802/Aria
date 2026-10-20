import { run } from "@/lib/server/handlers";
import { projectDeleteHandler, projectPatchHandler } from "@/lib/server/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function PATCH(request: Request) { return run(request, projectPatchHandler); }
export function DELETE(request: Request) { return run(request, projectDeleteHandler); }
