import { run } from "@/lib/server/handlers";
import { projectsGetHandler, projectsPostHandler } from "@/lib/server/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) { return run(request, projectsGetHandler); }
export function POST(request: Request) { return run(request, projectsPostHandler); }
