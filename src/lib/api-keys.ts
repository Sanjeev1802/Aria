export type StoredApiKey = {
  id: string
  projectName: string
  /** Visible prefix only — never the full secret after creation */
  prefix: string
  /** Last 4 characters of the secret for identification */
  suffix: string
  /** SHA-256 hash of the full secret (plaintext is never persisted) */
  keyHash: string
  createdAt: string
}

export function maskApiKey(prefix: string, suffix: string): string {
  return `${prefix}${"•".repeat(16)}${suffix}`
}

export function generateApiKeySecret(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const body = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  return `aria_${body}`
}

export async function hashApiKey(secret: string): Promise<string> {
  const data = new TextEncoder().encode(secret)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
