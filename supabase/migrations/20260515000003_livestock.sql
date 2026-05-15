-- =============================================================
-- HerdSync V2 — Lesotho National Breeding System
-- Migration 3: Livestock core table + pedigree records
-- =============================================================

-- =============================================================
-- LIVESTOCK
-- =============================================================
CREATE TABLE public.livestock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- National identity (ISO 11784/11785 — 15-digit electronic ID)
  national_id  TEXT UNIQUE,   -- 15-digit RFID number as text to preserve leading zeros
  rfid_tag     TEXT,          -- Human-readable label printed on the physical tag

  -- Classification
  species public.livestock_species NOT NULL,
  breed   TEXT,
  sex     public.livestock_sex NOT NULL,

  -- Physical characteristics
  color_markings TEXT,
  date_of_birth  DATE,
  birth_weight   NUMERIC(6,2),  -- kg
  weight         NUMERIC(6,2),  -- kg (most recent)

  -- Fiber production metrics (Merino / Angora)
  greasy_fleece_weight NUMERIC(6,3),  -- kg
  micron_diameter      NUMERIC(5,2),  -- mean fiber diameter (µm)
  staple_length        NUMERIC(5,1),  -- cm
  clean_yield_pct      NUMERIC(5,2),  -- % clean oven-dry yield

  -- Pedigree linkage
  sire_id                UUID REFERENCES public.livestock(id) ON DELETE SET NULL,
  dam_id                 UUID REFERENCES public.livestock(id) ON DELETE SET NULL,
  generation_number      INTEGER NOT NULL DEFAULT 0,
  inbreeding_coefficient NUMERIC(8,6) NOT NULL DEFAULT 0,

  -- Location
  district_id         UUID NOT NULL REFERENCES public.districts(id),
  breeding_center_id  UUID REFERENCES public.breeding_centers(id),

  -- Farmer owner (for animals brought in via culling program)
  owner_farmer_id UUID REFERENCES public.farmers(id) ON DELETE SET NULL,

  -- Status
  status           public.livestock_status NOT NULL DEFAULT 'active',
  acquisition_date DATE,
  acquisition_source TEXT,

  -- Removal
  removed_at     TIMESTAMPTZ,
  removal_reason TEXT,

  -- Metadata
  notes          TEXT,
  registered_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce: national_id must be exactly 15 digits when provided
ALTER TABLE public.livestock
  ADD CONSTRAINT chk_national_id_format
  CHECK (national_id IS NULL OR national_id ~ '^\d{15}$');

CREATE INDEX idx_livestock_national_id       ON public.livestock (national_id);
CREATE INDEX idx_livestock_district          ON public.livestock (district_id);
CREATE INDEX idx_livestock_center            ON public.livestock (breeding_center_id);
CREATE INDEX idx_livestock_species_status    ON public.livestock (species, status);
CREATE INDEX idx_livestock_sire              ON public.livestock (sire_id);
CREATE INDEX idx_livestock_dam               ON public.livestock (dam_id);

CREATE TRIGGER trg_livestock_updated_at
  BEFORE UPDATE ON public.livestock
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- PEDIGREE RECORDS
-- Materialised lineage cache — one row per ancestor relationship.
-- Populated by the application layer when an animal is registered.
-- =============================================================
CREATE TABLE public.pedigree_records (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id        UUID NOT NULL REFERENCES public.livestock(id) ON DELETE CASCADE,
  ancestor_id      UUID NOT NULL REFERENCES public.livestock(id) ON DELETE CASCADE,
  -- Plain-English relationship label
  relationship     TEXT NOT NULL,
  -- 1 = parent, 2 = grandparent, 3 = great-grandparent, etc.
  generation_depth INTEGER NOT NULL CHECK (generation_depth >= 1),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (animal_id, ancestor_id)
);

CREATE INDEX idx_pedigree_animal   ON public.pedigree_records (animal_id);
CREATE INDEX idx_pedigree_ancestor ON public.pedigree_records (ancestor_id);

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE public.livestock        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedigree_records ENABLE ROW LEVEL SECURITY;

-- Livestock — all authenticated staff can read
CREATE POLICY "Staff can view livestock"
  ON public.livestock FOR SELECT
  TO authenticated USING (true);

-- Field workers can register animals in their own district/center
CREATE POLICY "Staff can register livestock"
  ON public.livestock FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() = 'system_admin'
    OR district_id = public.get_user_district_id()
  );

-- District officers and above, plus the registering field worker, can update
CREATE POLICY "Staff can update livestock"
  ON public.livestock FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager', 'veterinarian')
    OR registered_by = auth.uid()
  )
  WITH CHECK (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager', 'veterinarian')
    OR registered_by = auth.uid()
  );

-- Only admins can hard-delete
CREATE POLICY "System admins can delete livestock"
  ON public.livestock FOR DELETE
  TO authenticated
  USING (public.get_user_role() = 'system_admin');

-- Pedigree records follow the same access pattern as livestock
CREATE POLICY "Staff can view pedigree records"
  ON public.pedigree_records FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Staff can insert pedigree records"
  ON public.pedigree_records FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager', 'veterinarian', 'field_worker'));

CREATE POLICY "Admins can delete pedigree records"
  ON public.pedigree_records FOR DELETE
  TO authenticated
  USING (public.get_user_role() = 'system_admin');
