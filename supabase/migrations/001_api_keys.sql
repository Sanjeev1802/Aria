-- Aria API keys (run in Supabase SQL editor or via CLI)
create table if not exists public.api_keys (
  id text primary key,
  uid text not null,
  project_name text not null,
  prefix text not null,
  suffix text not null,
  key_hash text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz null
);

create index if not exists api_keys_uid_idx on public.api_keys (uid);
create unique index if not exists api_keys_key_hash_active_uidx
  on public.api_keys (key_hash)
  where revoked_at is null;

alter table public.api_keys enable row level security;

-- Server uses the service role key (bypasses RLS). No public policies on purpose.
