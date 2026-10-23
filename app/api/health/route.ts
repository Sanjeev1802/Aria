export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Load balancer liveness check. Deliberately touches no AWS service or session. */
export function GET() {
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
