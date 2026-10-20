import { run } from "@/lib/server/handlers";
import { threadDeleteHandler, threadGetHandler, threadPatchHandler } from "@/lib/server/threads";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return run(request, threadGetHandler); }
export function PATCH(request: Request) { return run(request, threadPatchHandler); }
export function DELETE(request: Request) { return run(request, threadDeleteHandler); }
