import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export type ApiKeyRow = {
  id: string
  uid: string
  project_name: string
  prefix: string
  suffix: string
  key_hash: string
  created_at: string
  revoked_at: string | null
}

export type Database = {
  public: {
    Tables: {
      api_keys: {
        Row: ApiKeyRow
        Insert: ApiKeyRow
        Update: Partial<ApiKeyRow>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

let client: SupabaseClient<Database> | null = null

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (client) return client

  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    )
  }

  client = createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return client
}
