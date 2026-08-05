import { requireUserId } from "@/lib/auth-request"
import {
  createApiKeyForUser,
  listApiKeysForUser,
} from "@/lib/api-keys-server"

export async function GET(request: Request) {
  const auth = await requireUserId(request)
  if (auth instanceof Response) return auth

  try {
    const keys = await listApiKeysForUser(auth.uid)
    return Response.json({ keys })
  } catch (error) {
    console.error("list api keys failed", error)
    const message =
      error instanceof Error ? error.message : "Failed to list API keys."
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireUserId(request)
  if (auth instanceof Response) return auth

  let body: { projectName?: string }
  try {
    body = (await request.json()) as { projectName?: string }
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const projectName = body.projectName?.trim()
  if (!projectName) {
    return Response.json({ error: "Project name is required." }, { status: 400 })
  }

  try {
    const { record, secret } = await createApiKeyForUser(auth.uid, projectName)
    return Response.json({ record, secret })
  } catch (error) {
    console.error("create api key failed", error)
    const message =
      error instanceof Error ? error.message : "Failed to create API key."
    return Response.json({ error: message }, { status: 500 })
  }
}
