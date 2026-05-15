-- =============================================================
-- HerdSync V2 — Lesotho National Breeding System
-- Migration 13: Genetic indices (Basotho-specific calculations)
--
-- Three mandated indices:
--   1. Annual Mortality Rate  = deaths / avg_herd_size × 100
--   2. Annual Offtake Rate    = (sales + slaughter + stolen + gifts_out
--                               − gifts_in − purchases) / avg_herd_size × 100
--   3. Lambing/Kidding Rate   = parturitions / total_female_animal_days × 365
--      (animal-days = Σ days each female was present in the period)
-- =============================================================

CREATE TABLE public.genetic_indices (
  id                          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  district_id                 UUID NOT NULL REFERENCES public.districts(id),
  breeding_center_id          UUID REFERENCES public.breeding_centers(id),
  species                     public.livestock_species NOT NULL,
  year                        INTEGER NOT NULL CHECK (year >= 2000),

  -- Herd size snapshots (used as denominator)
  herd_size_start             INTEGER NOT NULL DEFAULT 0,
  herd_size_end               INTEGER NOT NULL DEFAULT 0,
  avg_herd_size               NUMERIC(10,2),

  -- Movement totals for the year
  total_deaths                INTEGER NOT NULL DEFAULT 0,
  total_sales                 INTEGER NOT NULL DEFAULT 0,
  total_slaughter             INTEGER NOT NULL DEFAULT 0,
  total_stolen                INTEGER NOT NULL DEFAULT 0,
  total_gifts_out             INTEGER NOT NULL DEFAULT 0,
  total_gifts_in              INTEGER NOT NULL DEFAULT 0,
  total_purchases             INTEGER NOT NULL DEFAULT 0,
  total_births                INTEGER NOT NULL DEFAULT 0,

  -- Breeding denominators
  total_parturitions          INTEGER NOT NULL DEFAULT 0,
  total_female_animal_days    NUMERIC(12,2),

  -- Computed Basotho indices
  annual_mortality_rate       NUMERIC(7,4),   -- %
  annual_offtake_rate         NUMERIC(7,4),   -- %
  lambing_kidding_rate        NUMERIC(7,4),   -- parturitions per animal-day × 365

  -- Fiber production averages (for Merino/Angora reporting)
  avg_greasy_fleece_weight    NUMERIC(6,3),
  avg_micron_diameter         NUMERIC(5,2),
  avg_staple_length           NUMERIC(5,1),
  avg_clean_yield_pct         NUMERIC(5,2),

  calculated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  calculated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (district_id, breeding_center_id, species, year)
);

CREATE INDEX idx_genetic_district ON public.genetic_indices (district_id);
CREATE INDEX idx_genetic_year     ON public.genetic_indices (year);
CREATE INDEX idx_genetic_species  ON public.genetic_indices (species);

-- =============================================================
-- CALCULATE_GENETIC_INDICES
-- Computes all three Basotho indices for a district/species/year
-- and upserts into genetic_indices.
-- Called by the scheduled edge function or manually by officers.
-- =============================================================
CREATE OR REPLACE FUNCTION public.calculate_genetic_indices(
  _district_id        UUID,
  _species            public.livestock_species,
  _year               INTEGER,
  _breeding_center_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _period_start       DATE := make_date(_year, 1, 1);
  _period_end         DATE := make_date(_year, 12, 31);

  _herd_start         INTEGER;
  _herd_end           INTEGER;
  _avg_herd           NUMERIC(10,2);

  -- Movement buckets
  _deaths             INTEGER;
  _sales              INTEGER;
  _slaughter          INTEGER;
  _stolen             INTEGER;
  _gifts_out          INTEGER;
  _gifts_in           INTEGER;
  _purchases          INTEGER;
  _births             INTEGER;

  -- Breeding
  _parturitions       INTEGER;
  _female_animal_days NUMERIC(12,2);

  -- Indices
  _mortality_rate     NUMERIC(7,4);
  _offtake_rate       NUMERIC(7,4);
  _lambing_rate       NUMERIC(7,4);

  -- Fiber
  _avg_fleece         NUMERIC(6,3);
  _avg_micron         NUMERIC(5,2);
  _avg_staple         NUMERIC(5,1);
  _avg_yield          NUMERIC(5,2);
BEGIN
  -- ── Herd size at start and end of year ───────────────────────
  SELECT COUNT(*) INTO _herd_start
  FROM public.livestock
  WHERE species = _species
    AND district_id = _district_id
    AND (_breeding_center_id IS NULL OR breeding_center_id = _breeding_center_id)
    AND status = 'active'
    AND (acquisition_date IS NULL OR acquisition_date <= _period_start);

  SELECT COUNT(*) INTO _herd_end
  FROM public.livestock
  WHERE species = _species
    AND district_id = _district_id
    AND (_breeding_center_id IS NULL OR breeding_center_id = _breeding_center_id)
    AND status = 'active'
    AND (acquisition_date IS NULL OR acquisition_date <= _period_end);

  _avg_herd := (_herd_start + _herd_end)::NUMERIC / 2.0;

  -- ── Movement buckets ─────────────────────────────────────────
  SELECT
    COUNT(*) FILTER (WHERE movement_type = 'death')        ,
    COUNT(*) FILTER (WHERE movement_type = 'sale')         ,
    COUNT(*) FILTER (WHERE movement_type = 'slaughter')    ,
    COUNT(*) FILTER (WHERE movement_type = 'stolen')       ,
    COUNT(*) FILTER (WHERE movement_type = 'gift_out')     ,
    COUNT(*) FILTER (WHERE movement_type = 'gift_in')      ,
    COUNT(*) FILTER (WHERE movement_type = 'purchase')     ,
    COUNT(*) FILTER (WHERE movement_type = 'birth')
  INTO _deaths, _sales, _slaughter, _stolen, _gifts_out, _gifts_in, _purchases, _births
  FROM public.livestock_movements
  WHERE species = _species
    AND district_id = _district_id
    AND (_breeding_center_id IS NULL OR breeding_center_id = _breeding_center_id)
    AND movement_date BETWEEN _period_start AND _period_end;

  -- ── Parturitions (birthing records) ──────────────────────────
  SELECT COUNT(*) INTO _parturitions
  FROM public.birthing_records b
  JOIN public.livestock l ON l.id = b.dam_id
  WHERE l.species = _species
    AND b.district_id = _district_id
    AND b.birth_date BETWEEN _period_start AND _period_end;

  -- ── Female animal-days ────────────────────────────────────────
  -- Sum of (min(removal_date, period_end) - max(acquisition_date, period_start))
  -- for each female active during the period.
  SELECT COALESCE(SUM(
    GREATEST(
      (LEAST(COALESCE(removed_at::DATE, _period_end), _period_end)
       - GREATEST(COALESCE(acquisition_date, _period_start), _period_start))::INTEGER,
      0
    )
  ), 0) INTO _female_animal_days
  FROM public.livestock
  WHERE species = _species
    AND sex = 'female'
    AND district_id = _district_id
    AND (_breeding_center_id IS NULL OR breeding_center_id = _breeding_center_id)
    AND (acquisition_date IS NULL OR acquisition_date <= _period_end)
    AND (removed_at IS NULL OR removed_at::DATE >= _period_start);

  -- ── Fiber averages ────────────────────────────────────────────
  SELECT
    AVG(greasy_fleece_weight),
    AVG(micron_diameter),
    AVG(staple_length),
    AVG(clean_yield_pct)
  INTO _avg_fleece, _avg_micron, _avg_staple, _avg_yield
  FROM public.livestock
  WHERE species = _species
    AND district_id = _district_id
    AND (_breeding_center_id IS NULL OR breeding_center_id = _breeding_center_id)
    AND status = 'active';

  -- ── Compute indices ───────────────────────────────────────────
  _mortality_rate := CASE WHEN _avg_herd > 0
    THEN (_deaths::NUMERIC / _avg_herd) * 100 ELSE NULL END;

  _offtake_rate := CASE WHEN _avg_herd > 0
    THEN ((_sales + _slaughter + _stolen + _gifts_out
           - _gifts_in - _purchases)::NUMERIC / _avg_herd) * 100
    ELSE NULL END;

  _lambing_rate := CASE WHEN _female_animal_days > 0
    THEN (_parturitions::NUMERIC / _female_animal_days) * 365 ELSE NULL END;

  -- ── Upsert ────────────────────────────────────────────────────
  INSERT INTO public.genetic_indices (
    district_id, breeding_center_id, species, year,
    herd_size_start, herd_size_end, avg_herd_size,
    total_deaths, total_sales, total_slaughter, total_stolen,
    total_gifts_out, total_gifts_in, total_purchases, total_births,
    total_parturitions, total_female_animal_days,
    annual_mortality_rate, annual_offtake_rate, lambing_kidding_rate,
    avg_greasy_fleece_weight, avg_micron_diameter, avg_staple_length, avg_clean_yield_pct,
    calculated_at, calculated_by
  )
  VALUES (
    _district_id, _breeding_center_id, _species, _year,
    _herd_start, _herd_end, _avg_herd,
    COALESCE(_deaths,0), COALESCE(_sales,0), COALESCE(_slaughter,0), COALESCE(_stolen,0),
    COALESCE(_gifts_out,0), COALESCE(_gifts_in,0), COALESCE(_purchases,0), COALESCE(_births,0),
    COALESCE(_parturitions,0), _female_animal_days,
    _mortality_rate, _offtake_rate, _lambing_rate,
    _avg_fleece, _avg_micron, _avg_staple, _avg_yield,
    now(), auth.uid()
  )
  ON CONFLICT (district_id, breeding_center_id, species, year)
  DO UPDATE SET
    herd_size_start          = EXCLUDED.herd_size_start,
    herd_size_end            = EXCLUDED.herd_size_end,
    avg_herd_size            = EXCLUDED.avg_herd_size,
    total_deaths             = EXCLUDED.total_deaths,
    total_sales              = EXCLUDED.total_sales,
    total_slaughter          = EXCLUDED.total_slaughter,
    total_stolen             = EXCLUDED.total_stolen,
    total_gifts_out          = EXCLUDED.total_gifts_out,
    total_gifts_in           = EXCLUDED.total_gifts_in,
    total_purchases          = EXCLUDED.total_purchases,
    total_births             = EXCLUDED.total_births,
    total_parturitions       = EXCLUDED.total_parturitions,
    total_female_animal_days = EXCLUDED.total_female_animal_days,
    annual_mortality_rate    = EXCLUDED.annual_mortality_rate,
    annual_offtake_rate      = EXCLUDED.annual_offtake_rate,
    lambing_kidding_rate     = EXCLUDED.lambing_kidding_rate,
    avg_greasy_fleece_weight = EXCLUDED.avg_greasy_fleece_weight,
    avg_micron_diameter      = EXCLUDED.avg_micron_diameter,
    avg_staple_length        = EXCLUDED.avg_staple_length,
    avg_clean_yield_pct      = EXCLUDED.avg_clean_yield_pct,
    calculated_at            = EXCLUDED.calculated_at,
    calculated_by            = EXCLUDED.calculated_by;
END;
$$;

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE public.genetic_indices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All staff can view genetic indices"
  ON public.genetic_indices FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Officers and above can manage genetic indices"
  ON public.genetic_indices FOR ALL
  TO authenticated
  USING (public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager'))
  WITH CHECK (public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager'));
