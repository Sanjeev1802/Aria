import { run, sessionHandler } from "@/lib/server/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return run(request, sessionHandler);
}
