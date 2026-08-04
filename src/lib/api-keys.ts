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

const STORAGE_KEY = "aria.apiKeys"

function storageKeyForUser(uid: string) {
  return `${STORAGE_KEY}.${uid}`
}

export async function hashApiKey(secret: string): Promise<string> {
  const data = new TextEncoder().encode(secret)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export function generateApiKeySecret(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const body = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  return `aria_${body}`
}

export function maskApiKey(prefix: string, suffix: string): string {
  return `${prefix}${"•".repeat(16)}${suffix}`
}

export function loadApiKeys(uid: string): StoredApiKey[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(storageKeyForUser(uid))
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredApiKey[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveApiKeys(uid: string, keys: StoredApiKey[]) {
  localStorage.setItem(storageKeyForUser(uid), JSON.stringify(keys))
}

export async function createApiKeyRecord(
  projectName: string
): Promise<{ record: StoredApiKey; secret: string }> {
  const secret = generateApiKeySecret()
  const keyHash = await hashApiKey(secret)
  const record: StoredApiKey = {
    id: crypto.randomUUID(),
    projectName: projectName.trim(),
    prefix: secret.slice(0, 10),
    suffix: secret.slice(-4),
    keyHash,
    createdAt: new Date().toISOString(),
  }
  return { record, secret }
}
