create table if not exists public.meal_history_daily (
  snapshot_date date primary key,
  total_meals integer not null default 0,
  department_counts jsonb not null default '{}'::jsonb,
  source_updated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meal_history_daily_date_idx on public.meal_history_daily(snapshot_date desc);

create or replace function public.meal_history_daily_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists meal_history_daily_set_updated_at_trigger on public.meal_history_daily;
create trigger meal_history_daily_set_updated_at_trigger
before update on public.meal_history_daily
for each row
execute function public.meal_history_daily_set_updated_at();

alter table public.meal_history_daily enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'meal_history_daily'
      and policyname = 'service_role_all_meal_history_daily'
  ) then
    create policy service_role_all_meal_history_daily
    on public.meal_history_daily
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;
end $$;
