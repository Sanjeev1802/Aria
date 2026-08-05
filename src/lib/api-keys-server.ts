import { createHash, randomBytes } from "crypto"
import type { StoredApiKey } from "@/lib/api-keys"
import { getSupabaseAdmin, type ApiKeyRow } from "@/lib/supabase"

export type ApiKeyRecord = StoredApiKey & {
  uid: string
  revokedAt: string | null
}

export function hashApiKeySync(secret: string): string {
  return createHash("sha256").update(secret).digest("hex")
}

export function generateApiKeySecretServer(): string {
  return `aria_${randomBytes(24).toString("hex")}`
}

function fromRow(row: ApiKeyRow): ApiKeyRecord {
  return {
    id: row.id,
    uid: row.uid,
    projectName: row.project_name,
    prefix: row.prefix,
    suffix: row.suffix,
    keyHash: row.key_hash,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  }
}

function toPublic(record: ApiKeyRecord): StoredApiKey {
  return {
    id: record.id,
    projectName: record.projectName,
    prefix: record.prefix,
    suffix: record.suffix,
    keyHash: record.keyHash,
    createdAt: record.createdAt,
  }
}

export async function createApiKeyForUser(
  uid: string,
  projectName: string
): Promise<{ record: StoredApiKey; secret: string }> {
  const secret = generateApiKeySecretServer()
  const keyHash = hashApiKeySync(secret)
  const id = randomBytes(16).toString("hex")
  const createdAt = new Date().toISOString()

  const row: ApiKeyRow = {
    id,
    uid,
    project_name: projectName.trim(),
    prefix: secret.slice(0, 10),
    suffix: secret.slice(-4),
    key_hash: keyHash,
    created_at: createdAt,
    revoked_at: null,
  }

  const { error } = await getSupabaseAdmin().from("api_keys").insert(row)
  if (error) {
    throw new Error(error.message || "Failed to insert API key.")
  }

  return { record: toPublic(fromRow(row)), secret }
}

export async function listApiKeysForUser(uid: string): Promise<StoredApiKey[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("api_keys")
    .select("*")
    .eq("uid", uid)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message || "Failed to list API keys.")
  }

  return (data || []).map((row) => toPublic(fromRow(row)))
}

export async function revokeApiKeyForUser(
  uid: string,
  keyId: string
): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("uid", uid)
    .is("revoked_at", null)
    .select("id")

  if (error) {
    throw new Error(error.message || "Failed to revoke API key.")
  }

  return (data?.length ?? 0) > 0
}

export async function findActiveApiKeyBySecret(
  secret: string
): Promise<ApiKeyRecord | null> {
  if (!secret.startsWith("aria_")) return null
  const keyHash = hashApiKeySync(secret)

  const { data, error } = await getSupabaseAdmin()
    .from("api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || "Failed to look up API key.")
  }
  if (!data) return null
  return fromRow(data)
}
