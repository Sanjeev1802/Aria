import { resetPasswordHandler, run } from "@/lib/server/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return run(request, resetPasswordHandler);
}
