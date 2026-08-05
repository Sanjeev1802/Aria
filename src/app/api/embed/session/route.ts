import { extractBearerSecret } from "@/lib/auth-request"
import { findActiveApiKeyBySecret } from "@/lib/api-keys-server"
import { buildEmbedChatUrl, createEmbedToken } from "@/lib/embed-session"

function requestOrigin(request: Request): string {
  const env =
    process.env.ARIA_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.PUBLIC_BASE_URL
  if (env) return env.replace(/\/$/, "")

  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host")
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host?.includes("localhost") ? "http" : "https")
  if (host) return `${proto}://${host}`
  return new URL(request.url).origin
}

export async function POST(request: Request) {
  const secret = extractBearerSecret(request)
  if (!secret) {
    return Response.json(
      { error: "Missing Authorization: Bearer <ARIA_API_KEY>." },
      { status: 401 }
    )
  }

  try {
    const key = await findActiveApiKeyBySecret(secret)
    if (!key) {
      return Response.json({ error: "Invalid or revoked API key." }, { status: 401 })
    }

    const token = createEmbedToken(key)
    const origin = requestOrigin(request)
    const embedUrl = buildEmbedChatUrl(origin, token)

    return Response.json({
      embedUrl,
      token,
      projectName: key.projectName,
      expiresIn: 60 * 60 * 8,
    })
  } catch (error) {
    console.error("embed session failed", error)
    return Response.json(
      { error: "Failed to create embed session." },
      { status: 500 }
    )
  }
}
