create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  role text not null default 'Viewer' check (role in ('Admin', 'Accommodation', 'Viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_id text not null unique,
  building text,
  building_code text,
  floor text,
  room_no text,
  room_type text default 'Internal',
  ac boolean not null default false,
  attached boolean not null default true,
  room_active text not null default 'Yes',
  total_beds integer not null default 1,
  used_beds integer not null default 0,
  available_beds integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.occupancy (
  id uuid primary key default gen_random_uuid(),
  person_type text default 'Permanent',
  staff_id text,
  full_name text,
  section text,
  department text,
  nationality text,
  room_id text,
  bed_no integer,
  fasting boolean not null default false,
  check_in text,
  check_out text,
  status text not null default 'Active',
  building text,
  building_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stay_history (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  occupant_name text,
  room_id text,
  details jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_rooms_updated_at ON public.rooms;
CREATE TRIGGER set_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_occupancy_updated_at ON public.occupancy;
CREATE TRIGGER set_occupancy_updated_at
BEFORE UPDATE ON public.occupancy
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_role text := 'Viewer';
begin
  if not exists (select 1 from public.profiles) then
    default_role := 'Admin';
  end if;

  insert into public.profiles (id, email, role, active)
  values (new.id, new.email, default_role, true)
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.occupancy enable row level security;
alter table public.stay_history enable row level security;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "rooms_read_authenticated" ON public.rooms;
CREATE POLICY "rooms_read_authenticated"
ON public.rooms
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "occupancy_read_authenticated" ON public.occupancy;
CREATE POLICY "occupancy_read_authenticated"
ON public.occupancy
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "history_read_authenticated" ON public.stay_history;
CREATE POLICY "history_read_authenticated"
ON public.stay_history
FOR SELECT
TO authenticated
USING (true);
