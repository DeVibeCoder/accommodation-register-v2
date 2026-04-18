alter table public.profiles enable row level security;
alter table public.occupancy enable row level security;
alter table public.rooms enable row level security;

-- Remove permissive anonymous policies
DROP POLICY IF EXISTS "Allow anon select occupancy" ON public.occupancy;
DROP POLICY IF EXISTS "Allow anon insert occupancy" ON public.occupancy;
DROP POLICY IF EXISTS "Allow anon update occupancy" ON public.occupancy;
DROP POLICY IF EXISTS "Allow anon delete occupancy" ON public.occupancy;
DROP POLICY IF EXISTS "Allow anon select rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow anon insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow anon update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow anon delete rooms" ON public.rooms;

-- Profiles policies
DROP POLICY IF EXISTS "Profiles select own or admin" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update admin only" ON public.profiles;

CREATE POLICY "Profiles select own or admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.id = auth.uid()
      AND me.role = 'Admin'
      AND me.active = true
  )
);

CREATE POLICY "Profiles update admin only"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.id = auth.uid()
      AND me.role = 'Admin'
      AND me.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.id = auth.uid()
      AND me.role = 'Admin'
      AND me.active = true
  )
);

-- Occupancy policies
DROP POLICY IF EXISTS "Occupancy read authenticated" ON public.occupancy;
DROP POLICY IF EXISTS "Occupancy insert admin accommodation" ON public.occupancy;
DROP POLICY IF EXISTS "Occupancy update admin accommodation" ON public.occupancy;
DROP POLICY IF EXISTS "Occupancy delete admin accommodation" ON public.occupancy;

CREATE POLICY "Occupancy read authenticated"
ON public.occupancy
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.active = true
  )
);

CREATE POLICY "Occupancy insert admin accommodation"
ON public.occupancy
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.active = true
      AND p.role IN ('Admin', 'Accommodation')
  )
);

CREATE POLICY "Occupancy update admin accommodation"
ON public.occupancy
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.active = true
      AND p.role IN ('Admin', 'Accommodation')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.active = true
      AND p.role IN ('Admin', 'Accommodation')
  )
);

CREATE POLICY "Occupancy delete admin accommodation"
ON public.occupancy
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.active = true
      AND p.role IN ('Admin', 'Accommodation')
  )
);

-- Rooms policies
DROP POLICY IF EXISTS "Rooms read authenticated" ON public.rooms;
DROP POLICY IF EXISTS "Rooms update admin accommodation" ON public.rooms;
DROP POLICY IF EXISTS "Rooms insert admin only" ON public.rooms;
DROP POLICY IF EXISTS "Rooms delete admin only" ON public.rooms;

CREATE POLICY "Rooms read authenticated"
ON public.rooms
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.active = true
  )
);

CREATE POLICY "Rooms update admin accommodation"
ON public.rooms
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.active = true
      AND p.role IN ('Admin', 'Accommodation')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.active = true
      AND p.role IN ('Admin', 'Accommodation')
  )
);

CREATE POLICY "Rooms insert admin only"
ON public.rooms
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.active = true
      AND p.role = 'Admin'
  )
);

CREATE POLICY "Rooms delete admin only"
ON public.rooms
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.active = true
      AND p.role = 'Admin'
  )
);
