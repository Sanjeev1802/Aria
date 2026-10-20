import { membersDeleteHandler, membersGetHandler, membersPostHandler, run } from "@/lib/server/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return run(request, membersGetHandler);
}

export function POST(request: Request) {
  return run(request, membersPostHandler);
}

export function DELETE(request: Request) {
  return run(request, membersDeleteHandler);
}
