create table if not exists public.meal_exclusions (
  id uuid primary key default gen_random_uuid(),
  occupant_id uuid null,
  occupant_name text null,
  staff_id text null,
  room_id text null,
  bed_no integer null,
  reason text not null,
  from_date date not null,
  to_date date null,
  notes text null,
  auto_checked_out_at timestamptz null,
  created_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists meal_exclusions_from_date_idx on public.meal_exclusions(from_date);
create index if not exists meal_exclusions_reason_idx on public.meal_exclusions(reason);
create index if not exists meal_exclusions_room_bed_idx on public.meal_exclusions(room_id, bed_no);

alter table public.meal_exclusions enable row level security;

-- Keep policy simple because server routes use service role.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'meal_exclusions'
      and policyname = 'service_role_all_meal_exclusions'
  ) then
    create policy service_role_all_meal_exclusions
    on public.meal_exclusions
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;
end $$;
