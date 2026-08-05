import { adminAuth } from "@/lib/firebase-admin"

export async function requireUserId(
  request: Request
): Promise<{ uid: string } | Response> {
  const header = request.headers.get("authorization") || ""
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match?.[1]) {
    return Response.json({ error: "Missing Authorization bearer token." }, { status: 401 })
  }

  try {
    const decoded = await adminAuth().verifyIdToken(match[1])
    return { uid: decoded.uid }
  } catch {
    return Response.json({ error: "Invalid or expired auth token." }, { status: 401 })
  }
}

export function extractBearerSecret(request: Request): string | null {
  const header = request.headers.get("authorization") || ""
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}
