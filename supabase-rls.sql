alter table public.occupancy enable row level security;
alter table public.rooms enable row level security;

drop policy if exists "Allow anon select occupancy" on public.occupancy;
drop policy if exists "Allow anon insert occupancy" on public.occupancy;
drop policy if exists "Allow anon update occupancy" on public.occupancy;
drop policy if exists "Allow anon delete occupancy" on public.occupancy;

create policy "Allow anon select occupancy"
on public.occupancy
for select
to anon
using (true);

create policy "Allow anon insert occupancy"
on public.occupancy
for insert
to anon
with check (true);

create policy "Allow anon update occupancy"
on public.occupancy
for update
to anon
using (true)
with check (true);

create policy "Allow anon delete occupancy"
on public.occupancy
for delete
to anon
using (true);

drop policy if exists "Allow anon select rooms" on public.rooms;
drop policy if exists "Allow anon insert rooms" on public.rooms;
drop policy if exists "Allow anon update rooms" on public.rooms;
drop policy if exists "Allow anon delete rooms" on public.rooms;

create policy "Allow anon select rooms"
on public.rooms
for select
to anon
using (true);

create policy "Allow anon insert rooms"
on public.rooms
for insert
to anon
with check (true);

create policy "Allow anon update rooms"
on public.rooms
for update
to anon
using (true)
with check (true);

create policy "Allow anon delete rooms"
on public.rooms
for delete
to anon
using (true);
