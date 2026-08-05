import { requireUserId } from "@/lib/auth-request"
import { revokeApiKeyForUser } from "@/lib/api-keys-server"

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserId(request)
  if (auth instanceof Response) return auth

  const { id } = await context.params
  if (!id) {
    return Response.json({ error: "Key id is required." }, { status: 400 })
  }

  try {
    const ok = await revokeApiKeyForUser(auth.uid, id)
    if (!ok) {
      return Response.json({ error: "API key not found." }, { status: 404 })
    }
    return Response.json({ ok: true })
  } catch (error) {
    console.error("revoke api key failed", error)
    const message =
      error instanceof Error ? error.message : "Failed to revoke API key."
    return Response.json({ error: message }, { status: 500 })
  }
}
