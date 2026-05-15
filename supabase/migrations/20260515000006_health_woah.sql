-- =============================================================
-- HerdSync V2 — Lesotho National Breeding System
-- Migration 6: Health records, vaccination records,
--              WOAH/OIE disease reports
-- =============================================================

-- =============================================================
-- HEALTH RECORDS
-- =============================================================
CREATE TABLE public.health_records (
  id                  UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  livestock_id        UUID NOT NULL REFERENCES public.livestock(id) ON DELETE CASCADE,
  district_id         UUID NOT NULL REFERENCES public.districts(id),
  breeding_center_id  UUID REFERENCES public.breeding_centers(id),
  event_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  -- 'vaccination', 'treatment', 'examination', 'diagnosis', 'quarantine', 'other'
  event_type          TEXT NOT NULL,
  diagnosis           TEXT,
  treatment           TEXT,
  medication          TEXT,
  dosage              TEXT,
  veterinarian_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  next_followup_date  DATE,
  attachment_url      TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_livestock ON public.health_records (livestock_id);
CREATE INDEX idx_health_district  ON public.health_records (district_id);
CREATE INDEX idx_health_date      ON public.health_records (event_date);

CREATE TRIGGER trg_health_records_updated_at
  BEFORE UPDATE ON public.health_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- VACCINATION RECORDS
-- Separated from general health for quick schedule queries.
-- =============================================================
CREATE TABLE public.vaccination_records (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  livestock_id     UUID NOT NULL REFERENCES public.livestock(id) ON DELETE CASCADE,
  vaccine_name     TEXT NOT NULL,
  disease_target   TEXT NOT NULL,
  vaccination_date DATE NOT NULL,
  batch_number     TEXT,
  next_due_date    DATE,
  administered_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vaccination_livestock  ON public.vaccination_records (livestock_id);
CREATE INDEX idx_vaccination_due        ON public.vaccination_records (next_due_date);

-- =============================================================
-- WOAH DISEASE REPORTS
-- Compliant with World Organisation for Animal Health (WOAH/OIE)
-- disease notification requirements.
-- =============================================================
CREATE TABLE public.woah_disease_reports (
  id                   UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  district_id          UUID NOT NULL REFERENCES public.districts(id),
  breeding_center_id   UUID REFERENCES public.breeding_centers(id),

  -- Disease identification
  disease_name         TEXT NOT NULL,
  woah_disease_code    TEXT,     -- Official WOAH disease list code
  species_affected     public.livestock_species NOT NULL,

  -- Timeline
  date_detected        DATE NOT NULL,
  date_reported        DATE NOT NULL DEFAULT CURRENT_DATE,
  resolved_at          DATE,

  -- Scope
  animals_at_risk      INTEGER,
  cases_confirmed      INTEGER NOT NULL DEFAULT 0,
  deaths               INTEGER NOT NULL DEFAULT 0,

  -- Status and response
  status               public.woah_disease_status NOT NULL DEFAULT 'suspected',
  containment_measures TEXT,

  -- Lab confirmation
  lab_confirmation     BOOLEAN NOT NULL DEFAULT false,
  lab_reference        TEXT,

  -- Reporting officer
  reported_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_woah_district ON public.woah_disease_reports (district_id);
CREATE INDEX idx_woah_status   ON public.woah_disease_reports (status);
CREATE INDEX idx_woah_detected ON public.woah_disease_reports (date_detected);

CREATE TRIGGER trg_woah_reports_updated_at
  BEFORE UPDATE ON public.woah_disease_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE public.health_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woah_disease_reports  ENABLE ROW LEVEL SECURITY;

-- Health records
CREATE POLICY "Staff can view health records"
  ON public.health_records FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Vets and above can manage health records"
  ON public.health_records FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('system_admin', 'veterinarian', 'district_officer', 'center_manager')
    OR district_id = public.get_user_district_id()
  );

CREATE POLICY "Vets and above can update health records"
  ON public.health_records FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN ('system_admin', 'veterinarian', 'district_officer', 'center_manager')
  )
  WITH CHECK (
    public.get_user_role() IN ('system_admin', 'veterinarian', 'district_officer', 'center_manager')
  );

-- Vaccination records
CREATE POLICY "Staff can view vaccination records"
  ON public.vaccination_records FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Vets and above can manage vaccination records"
  ON public.vaccination_records FOR ALL
  TO authenticated
  USING (public.get_user_role() IN ('system_admin', 'veterinarian', 'district_officer', 'center_manager'))
  WITH CHECK (public.get_user_role() IN ('system_admin', 'veterinarian', 'district_officer', 'center_manager'));

-- WOAH reports — all staff read; district officers+ write
CREATE POLICY "All staff can view WOAH reports"
  ON public.woah_disease_reports FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "District officers and vets can submit WOAH reports"
  ON public.woah_disease_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('system_admin', 'district_officer', 'veterinarian', 'center_manager')
  );

CREATE POLICY "District officers and vets can update WOAH reports"
  ON public.woah_disease_reports FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN ('system_admin', 'district_officer', 'veterinarian', 'center_manager')
  )
  WITH CHECK (
    public.get_user_role() IN ('system_admin', 'district_officer', 'veterinarian', 'center_manager')
  );
