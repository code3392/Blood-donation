-- Lifeline feature migration
-- Run this once in Supabase SQL Editor after the existing donor_profiles
-- and blood_requests tables are present.

alter table public.donor_profiles
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision,
  add column if not exists location_accuracy integer;

alter table public.blood_requests
  add column if not exists condition text;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  request_id text,
  body text not null,
  attachment_url text,
  attachment_name text,
  attachment_type text,
  attachment_size integer,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- If messages table already existed, add attachment columns safely
alter table public.messages
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size integer;

create index if not exists messages_sender_idx on public.messages(sender_id, created_at desc);
create index if not exists messages_recipient_idx on public.messages(recipient_id, created_at desc);
create index if not exists messages_request_idx on public.messages(request_id);

alter table public.messages enable row level security;

drop policy if exists "Users can read their own messages" on public.messages;
create policy "Users can read their own messages"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "Users can send messages as themselves" on public.messages;
create policy "Users can send messages as themselves"
  on public.messages for insert
  with check (auth.uid() = sender_id);

drop policy if exists "Recipients can mark messages read" on public.messages;
create policy "Recipients can mark messages read"
  on public.messages for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);
