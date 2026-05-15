-- =============================================================
-- HerdSync V2 — Lesotho National Breeding System
-- Migration 5: Culling and Exchange program
-- =============================================================
-- The culling/exchange program collects low-yielding animals
-- from rural farmers and replaces them with high-yielding
-- Merino rams or Angora bucks from the breeding center.
-- =============================================================

CREATE TABLE public.culling_exchange_records (
  id                   UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_id            UUID NOT NULL REFERENCES public.farmers(id),
  district_id          UUID NOT NULL REFERENCES public.districts(id),
  breeding_center_id   UUID NOT NULL REFERENCES public.breeding_centers(id),

  -- The farmer's animal being removed from the national herd
  culled_animal_id     UUID REFERENCES public.livestock(id) ON DELETE SET NULL,
  culled_animal_tag    TEXT,    -- Fallback for unregistered animals captured offline
  culled_animal_species public.livestock_species NOT NULL,
  culled_animal_breed  TEXT,
  culling_reason       TEXT,    -- e.g. 'low fiber yield', 'poor conformation'

  -- The replacement animal issued from the center
  replacement_animal_id   UUID REFERENCES public.livestock(id) ON DELETE SET NULL,
  replacement_type        TEXT,    -- e.g. 'merino_ram', 'angora_buck'

  -- Workflow state
  status           public.culling_exchange_status NOT NULL DEFAULT 'scheduled',
  scheduled_date   DATE,
  collection_date  DATE,
  replacement_date DATE,

  -- Officer who managed the exchange
  field_officer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_culling_farmer   ON public.culling_exchange_records (farmer_id);
CREATE INDEX idx_culling_district ON public.culling_exchange_records (district_id);
CREATE INDEX idx_culling_center   ON public.culling_exchange_records (breeding_center_id);
CREATE INDEX idx_culling_status   ON public.culling_exchange_records (status);

CREATE TRIGGER trg_culling_exchange_updated_at
  BEFORE UPDATE ON public.culling_exchange_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE public.culling_exchange_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view culling records"
  ON public.culling_exchange_records FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Field workers can create culling records in their district"
  ON public.culling_exchange_records FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() = 'system_admin'
    OR district_id = public.get_user_district_id()
  );

CREATE POLICY "Officers and above can update culling records"
  ON public.culling_exchange_records FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager')
    OR field_officer_id = auth.uid()
  )
  WITH CHECK (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager')
    OR field_officer_id = auth.uid()
  );

CREATE POLICY "System admins can delete culling records"
  ON public.culling_exchange_records FOR DELETE
  TO authenticated
  USING (public.get_user_role() = 'system_admin');
