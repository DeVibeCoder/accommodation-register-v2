create table if not exists public.system_backups (
  id uuid primary key default gen_random_uuid(),
  backup_key text not null unique,
  backup_type text not null check (backup_type in ('manual', 'daily')),
  backup_day date not null,
  note text null,
  snapshot jsonb not null,
  summary jsonb not null default '{}'::jsonb,
  row_count integer not null default 0,
  created_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists system_backups_created_at_idx on public.system_backups(created_at desc);
create index if not exists system_backups_type_day_idx on public.system_backups(backup_type, backup_day desc);

alter table public.system_backups enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'system_backups'
      and policyname = 'service_role_all_system_backups'
  ) then
    create policy service_role_all_system_backups
    on public.system_backups
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;
end $$;
