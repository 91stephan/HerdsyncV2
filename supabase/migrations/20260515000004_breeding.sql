-- =============================================================
-- HerdSync V2 — Lesotho National Breeding System
-- Migration 4: Breeding records, birthing records,
--              reproductive indices
-- =============================================================

-- =============================================================
-- BREEDING RECORDS  (planned mating events)
-- =============================================================
CREATE TABLE public.breeding_records (
  id                  UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sire_id             UUID NOT NULL REFERENCES public.livestock(id),
  dam_id              UUID NOT NULL REFERENCES public.livestock(id),
  breeding_center_id  UUID NOT NULL REFERENCES public.breeding_centers(id),
  district_id         UUID NOT NULL REFERENCES public.districts(id),
  mating_date         DATE NOT NULL,
  expected_birth_date DATE,
  outcome             public.breeding_outcome NOT NULL DEFAULT 'in_progress',
  notes               TEXT,
  recorded_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A sire/dam pair cannot have duplicate mating entries on the same date
  UNIQUE (sire_id, dam_id, mating_date)
);

CREATE INDEX idx_breeding_center   ON public.breeding_records (breeding_center_id);
CREATE INDEX idx_breeding_district ON public.breeding_records (district_id);
CREATE INDEX idx_breeding_sire     ON public.breeding_records (sire_id);
CREATE INDEX idx_breeding_dam      ON public.breeding_records (dam_id);

CREATE TRIGGER trg_breeding_records_updated_at
  BEFORE UPDATE ON public.breeding_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- BIRTHING RECORDS  (birth outcomes linked to breeding events)
-- =============================================================
CREATE TABLE public.birthing_records (
  id                  UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  breeding_record_id  UUID REFERENCES public.breeding_records(id) ON DELETE SET NULL,
  dam_id              UUID NOT NULL REFERENCES public.livestock(id),
  sire_id             UUID REFERENCES public.livestock(id),
  offspring_id        UUID REFERENCES public.livestock(id) ON DELETE SET NULL,
  birth_date          DATE NOT NULL,
  birth_weight        NUMERIC(6,2),  -- kg
  alive               BOOLEAN NOT NULL DEFAULT true,
  district_id         UUID NOT NULL REFERENCES public.districts(id),
  breeding_center_id  UUID REFERENCES public.breeding_centers(id),
  recorded_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_birthing_dam      ON public.birthing_records (dam_id);
CREATE INDEX idx_birthing_district ON public.birthing_records (district_id);

-- =============================================================
-- REPRODUCTIVE INDICES
-- Periodically computed summary stats per district / center.
-- Populated by a scheduled edge function or manual recalculation.
-- =============================================================
CREATE TABLE public.reproductive_indices (
  id                   UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  district_id          UUID NOT NULL REFERENCES public.districts(id),
  breeding_center_id   UUID REFERENCES public.breeding_centers(id),
  species              public.livestock_species NOT NULL,
  period_start         DATE NOT NULL,
  period_end           DATE NOT NULL,

  -- Raw counts
  total_females             INTEGER NOT NULL DEFAULT 0,
  total_births              INTEGER NOT NULL DEFAULT 0,
  live_births               INTEGER NOT NULL DEFAULT 0,
  deaths_before_weaning     INTEGER NOT NULL DEFAULT 0,
  weaned                    INTEGER NOT NULL DEFAULT 0,

  -- Computed rates (stored for fast reporting)
  lambing_kidding_rate  NUMERIC(7,4),  -- live_births / total_females
  weaning_survival_rate NUMERIC(7,4),  -- weaned / NULLIF(live_births,0)
  mortality_risk_rate   NUMERIC(7,4),  -- deaths_before_weaning / NULLIF(total_births,0)

  calculated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  calculated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (district_id, breeding_center_id, species, period_start, period_end)
);

CREATE INDEX idx_repro_district ON public.reproductive_indices (district_id);
CREATE INDEX idx_repro_period   ON public.reproductive_indices (period_start, period_end);

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE public.breeding_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthing_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reproductive_indices ENABLE ROW LEVEL SECURITY;

-- Breeding records
CREATE POLICY "Staff can view breeding records"
  ON public.breeding_records FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Staff can insert breeding records"
  ON public.breeding_records FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() = 'system_admin'
    OR district_id = public.get_user_district_id()
  );

CREATE POLICY "District officers and above can update breeding records"
  ON public.breeding_records FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager', 'veterinarian')
    OR recorded_by = auth.uid()
  )
  WITH CHECK (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager', 'veterinarian')
    OR recorded_by = auth.uid()
  );

-- Birthing records
CREATE POLICY "Staff can view birthing records"
  ON public.birthing_records FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Staff can insert birthing records"
  ON public.birthing_records FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() = 'system_admin'
    OR district_id = public.get_user_district_id()
  );

CREATE POLICY "Officers and above can update birthing records"
  ON public.birthing_records FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager', 'veterinarian')
    OR recorded_by = auth.uid()
  )
  WITH CHECK (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager', 'veterinarian')
    OR recorded_by = auth.uid()
  );

-- Reproductive indices — read by all, written only by officers/admins
CREATE POLICY "All staff can view reproductive indices"
  ON public.reproductive_indices FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Officers and above can manage reproductive indices"
  ON public.reproductive_indices FOR ALL
  TO authenticated
  USING (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager')
  )
  WITH CHECK (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager')
  );
