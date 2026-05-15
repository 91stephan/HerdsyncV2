-- =============================================================
-- HerdSync V2 — Lesotho National Breeding System
-- Migration 2: Core organisational structure
--   districts, breeding_centers, profiles, farmers
-- =============================================================

-- Shared updated_at trigger function (used by all tables)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================================
-- DISTRICTS
-- =============================================================
CREATE TABLE public.districts (
  id   UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,   -- 3-letter abbreviation e.g. 'MAS'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- BREEDING CENTERS
-- =============================================================
CREATE TABLE public.breeding_centers (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT NOT NULL,
  district_id      UUID NOT NULL REFERENCES public.districts(id),
  location         TEXT,
  gps_coordinates  TEXT,          -- 'lat,lng'
  contact_phone    TEXT,
  contact_email    TEXT,
  established_date DATE,
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_breeding_centers_updated_at
  BEFORE UPDATE ON public.breeding_centers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- PROFILES  (one row per auth.users entry)
-- =============================================================
CREATE TABLE public.profiles (
  id                  UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT,
  role                public.staff_role NOT NULL DEFAULT 'field_worker',
  district_id         UUID REFERENCES public.districts(id),
  breeding_center_id  UUID REFERENCES public.breeding_centers(id),
  phone               TEXT,
  employee_number     TEXT UNIQUE,
  active              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create a profile row whenever a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- FARMERS  (rural smallholders who participate in the program)
-- =============================================================
CREATE TABLE public.farmers (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name       TEXT NOT NULL,
  national_id     TEXT UNIQUE,   -- Lesotho national ID document number
  village         TEXT,
  district_id     UUID NOT NULL REFERENCES public.districts(id),
  phone           TEXT,
  gps_coordinates TEXT,
  notes           TEXT,
  registered_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_farmers_updated_at
  BEFORE UPDATE ON public.farmers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE public.districts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breeding_centers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmers           ENABLE ROW LEVEL SECURITY;

-- Helper: current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.staff_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper: current user's district
CREATE OR REPLACE FUNCTION public.get_user_district_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT district_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper: current user's breeding center
CREATE OR REPLACE FUNCTION public.get_user_center_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT breeding_center_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Districts: read-only for all authenticated users
CREATE POLICY "Authenticated users can view districts"
  ON public.districts FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "System admins can manage districts"
  ON public.districts FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'system_admin')
  WITH CHECK (public.get_user_role() = 'system_admin');

-- Breeding centers: all authenticated can read; managers/admins can write
CREATE POLICY "Authenticated users can view breeding centers"
  ON public.breeding_centers FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage breeding centers"
  ON public.breeding_centers FOR ALL
  TO authenticated
  USING (public.get_user_role() IN ('system_admin', 'center_manager'))
  WITH CHECK (public.get_user_role() IN ('system_admin', 'center_manager'));

-- Profiles: users see their own; admins see all
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.get_user_role() = 'system_admin')
  WITH CHECK (id = auth.uid() OR public.get_user_role() = 'system_admin');

CREATE POLICY "System admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role() = 'system_admin' OR id = auth.uid());

-- Farmers: field workers and above can read; district officers+ can write
CREATE POLICY "Staff can view farmers in their district"
  ON public.farmers FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() = 'system_admin'
    OR district_id = public.get_user_district_id()
  );

CREATE POLICY "Field workers and above can register farmers"
  ON public.farmers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() = 'system_admin'
    OR district_id = public.get_user_district_id()
  );

CREATE POLICY "District officers and above can update farmers"
  ON public.farmers FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager')
    OR (registered_by = auth.uid())
  )
  WITH CHECK (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager')
    OR (registered_by = auth.uid())
  );
