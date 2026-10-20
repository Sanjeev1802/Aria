import { run } from "@/lib/server/handlers";
import { threadsGetHandler, threadsPostHandler } from "@/lib/server/threads";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return run(request, threadsGetHandler); }
export function POST(request: Request) { return run(request, threadsPostHandler); }
