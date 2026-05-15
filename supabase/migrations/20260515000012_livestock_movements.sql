-- =============================================================
-- HerdSync V2 — Lesotho National Breeding System
-- Migration 12: Livestock movements
-- Used for offtake rate calculation:
--   offtake = (sales + slaughter + stolen + gifts_out)
--             − (gifts_in + purchases)
-- Also used for animal-days denominator in lambing/kidding rates.
-- =============================================================

CREATE TYPE public.movement_type AS ENUM (
  'sale',
  'slaughter',
  'stolen',
  'gift_out',
  'gift_in',
  'purchase',
  'transfer_in',
  'transfer_out',
  'death',
  'birth'
);

CREATE TABLE public.livestock_movements (
  id                  UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  livestock_id        UUID REFERENCES public.livestock(id) ON DELETE SET NULL,
  species             public.livestock_species NOT NULL,
  sex                 public.livestock_sex,
  movement_type       public.movement_type NOT NULL,
  movement_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity            INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),

  -- For sales/purchases
  unit_value          NUMERIC(10,2),   -- Lesotho Loti (M)
  total_value         NUMERIC(12,2),

  -- Who the animal went to / came from
  counterparty_name   TEXT,
  counterparty_type   TEXT,  -- 'farmer', 'abattoir', 'center', 'other'

  district_id         UUID NOT NULL REFERENCES public.districts(id),
  breeding_center_id  UUID REFERENCES public.breeding_centers(id),

  -- Reference to culling program if applicable
  culling_exchange_id UUID REFERENCES public.culling_exchange_records(id) ON DELETE SET NULL,

  recorded_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_movements_livestock ON public.livestock_movements (livestock_id);
CREATE INDEX idx_movements_district  ON public.livestock_movements (district_id);
CREATE INDEX idx_movements_date      ON public.livestock_movements (movement_date);
CREATE INDEX idx_movements_type      ON public.livestock_movements (movement_type);

CREATE TRIGGER trg_livestock_movements_updated_at
  BEFORE UPDATE ON public.livestock_movements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE public.livestock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view movements"
  ON public.livestock_movements FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Staff can record movements in their district"
  ON public.livestock_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() = 'system_admin'
    OR district_id = public.get_user_district_id()
  );

CREATE POLICY "Officers can update movements"
  ON public.livestock_movements FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager')
    OR recorded_by = auth.uid()
  )
  WITH CHECK (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager')
    OR recorded_by = auth.uid()
  );

CREATE POLICY "Admins can delete movements"
  ON public.livestock_movements FOR DELETE
  TO authenticated
  USING (public.get_user_role() = 'system_admin');
