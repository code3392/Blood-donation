-- LIFELINE DATABASE
-- Run this entire script in Supabase SQL Editor.
-- The browser uses ONLY the publishable key. Never put a secret/service-role key in app.js.

create extension if not exists pgcrypto;

create table if not exists public.donor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  blood_group text not null check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  district text not null,
  area text,
  phone text not null,
  last_donation_date date,
  available boolean not null default true,
  consent boolean not null default false,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blood_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  patient_name text not null check (char_length(patient_name) between 2 and 80),
  blood_group text not null check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  district text not null,
  hospital_location text not null,
  units_needed integer not null default 1 check (units_needed between 1 and 20),
  urgency text not null default 'urgent' check (urgency in ('critical','urgent','planned')),
  contact_phone text not null,
  note text,
  status text not null default 'open' check (status in ('open','fulfilled','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists donor_profiles_blood_idx on public.donor_profiles(blood_group);
create index if not exists donor_profiles_district_idx on public.donor_profiles(district);
create index if not exists donor_profiles_available_idx on public.donor_profiles(available);
create index if not exists blood_requests_status_idx on public.blood_requests(status);
create index if not exists blood_requests_blood_idx on public.blood_requests(blood_group);
create index if not exists blood_requests_district_idx on public.blood_requests(district);

alter table public.donor_profiles enable row level security;
alter table public.blood_requests enable row level security;

-- Remove broad policies if this script is re-run.
drop policy if exists "donors_select_authenticated" on public.donor_profiles;
drop policy if exists "donors_insert_own" on public.donor_profiles;
drop policy if exists "donors_update_own" on public.donor_profiles;
drop policy if exists "donors_delete_own" on public.donor_profiles;

drop policy if exists "requests_select_authenticated" on public.blood_requests;
drop policy if exists "requests_insert_own" on public.blood_requests;
drop policy if exists "requests_update_own" on public.blood_requests;
drop policy if exists "requests_delete_own" on public.blood_requests;

-- Authenticated users may search consented donor profiles.
create policy "donors_select_authenticated"
on public.donor_profiles for select
to authenticated
using (consent = true);

create policy "donors_insert_own"
on public.donor_profiles for insert
to authenticated
with check (auth.uid() = user_id and consent = true);

create policy "donors_update_own"
on public.donor_profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "donors_delete_own"
on public.donor_profiles for delete
to authenticated
using (auth.uid() = user_id);

-- Authenticated users can see active requests and their own requests.
create policy "requests_select_authenticated"
on public.blood_requests for select
to authenticated
using (status = 'open' or requester_id = auth.uid());

create policy "requests_insert_own"
on public.blood_requests for insert
to authenticated
with check (auth.uid() = requester_id);

create policy "requests_update_own"
on public.blood_requests for update
to authenticated
using (auth.uid() = requester_id)
with check (auth.uid() = requester_id);

create policy "requests_delete_own"
on public.blood_requests for delete
to authenticated
using (auth.uid() = requester_id);

-- Least-privilege grants for the browser Data API.
grant usage on schema public to anon, authenticated;
grant select on public.donor_profiles to authenticated;
grant insert, update, delete on public.donor_profiles to authenticated;
grant select on public.blood_requests to authenticated;
grant insert, update, delete on public.blood_requests to authenticated;

-- Keep updated_at current.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists donor_profiles_updated_at on public.donor_profiles;
create trigger donor_profiles_updated_at
before update on public.donor_profiles
for each row execute function public.set_updated_at();

drop trigger if exists blood_requests_updated_at on public.blood_requests;
create trigger blood_requests_updated_at
before update on public.blood_requests
for each row execute function public.set_updated_at();

-- Optional demo seed:
-- Insert real donor data only with consent. Do not use fake personal phone numbers in production.
