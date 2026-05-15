-- =============================================================
-- HerdSync V2 — Lesotho National Breeding System
-- Migration 10: Utility functions and reporting views
-- =============================================================

-- =============================================================
-- PEDIGREE — build ancestor cache for a single animal
-- Call after inserting a new livestock record that has
-- sire_id or dam_id populated.
-- =============================================================
CREATE OR REPLACE FUNCTION public.build_pedigree_cache(_animal_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sire_id UUID;
  _dam_id  UUID;
BEGIN
  SELECT sire_id, dam_id INTO _sire_id, _dam_id
  FROM public.livestock WHERE id = _animal_id;

  -- Insert direct parents (depth 1)
  IF _sire_id IS NOT NULL THEN
    INSERT INTO public.pedigree_records (animal_id, ancestor_id, relationship, generation_depth)
    VALUES (_animal_id, _sire_id, 'sire', 1)
    ON CONFLICT (animal_id, ancestor_id) DO NOTHING;

    -- Carry forward grandparents from the sire's cached lineage
    INSERT INTO public.pedigree_records (animal_id, ancestor_id, relationship, generation_depth)
    SELECT _animal_id, ancestor_id,
           CASE generation_depth
             WHEN 1 THEN 'paternal_grandsire'
             WHEN 2 THEN 'paternal_great_grandsire'
             ELSE 'paternal_ancestor_gen_' || (generation_depth + 1)::TEXT
           END,
           generation_depth + 1
    FROM public.pedigree_records
    WHERE animal_id = _sire_id AND generation_depth <= 3
    ON CONFLICT (animal_id, ancestor_id) DO NOTHING;
  END IF;

  IF _dam_id IS NOT NULL THEN
    INSERT INTO public.pedigree_records (animal_id, ancestor_id, relationship, generation_depth)
    VALUES (_animal_id, _dam_id, 'dam', 1)
    ON CONFLICT (animal_id, ancestor_id) DO NOTHING;

    INSERT INTO public.pedigree_records (animal_id, ancestor_id, relationship, generation_depth)
    SELECT _animal_id, ancestor_id,
           CASE generation_depth
             WHEN 1 THEN 'maternal_granddam'
             WHEN 2 THEN 'maternal_great_granddam'
             ELSE 'maternal_ancestor_gen_' || (generation_depth + 1)::TEXT
           END,
           generation_depth + 1
    FROM public.pedigree_records
    WHERE animal_id = _dam_id AND generation_depth <= 3
    ON CONFLICT (animal_id, ancestor_id) DO NOTHING;
  END IF;
END;
$$;

-- =============================================================
-- REPRODUCTIVE INDICES — recalculate for a district/period
-- =============================================================
CREATE OR REPLACE FUNCTION public.recalculate_reproductive_indices(
  _district_id  UUID,
  _period_start DATE,
  _period_end   DATE,
  _species      public.livestock_species
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total_females        INTEGER;
  _total_births         INTEGER;
  _live_births          INTEGER;
  _deaths_before_wean   INTEGER;
  _weaned               INTEGER;
  _lambing_rate         NUMERIC(7,4);
  _weaning_survival     NUMERIC(7,4);
  _mortality_risk       NUMERIC(7,4);
BEGIN
  -- Count breeding females active in the period
  SELECT COUNT(*) INTO _total_females
  FROM public.livestock
  WHERE district_id = _district_id
    AND species = _species
    AND sex = 'female'
    AND status = 'active'
    AND (acquisition_date IS NULL OR acquisition_date <= _period_end);

  -- Count all births in the period
  SELECT COUNT(*), COUNT(*) FILTER (WHERE b.alive)
  INTO _total_births, _live_births
  FROM public.birthing_records b
  JOIN public.livestock l ON l.id = b.dam_id
  WHERE b.district_id = _district_id
    AND l.species = _species
    AND b.birth_date BETWEEN _period_start AND _period_end;

  -- Deaths before weaning (health records with event_type='death' on young animals)
  SELECT COUNT(*) INTO _deaths_before_wean
  FROM public.livestock
  WHERE district_id = _district_id
    AND species = _species
    AND status = 'deceased'
    AND removed_at BETWEEN _period_start AND _period_end
    AND date_of_birth IS NOT NULL
    AND removed_at - date_of_birth < INTERVAL '90 days';

  -- Weaned (animals with weaning date within period)
  SELECT COUNT(*) INTO _weaned
  FROM public.birthing_records b
  JOIN public.livestock l ON l.id = b.offspring_id
  WHERE b.district_id = _district_id
    AND (SELECT species FROM public.livestock WHERE id = b.dam_id) = _species
    AND b.birth_date BETWEEN _period_start AND _period_end
    AND l.status != 'deceased';

  -- Compute rates
  _lambing_rate     := CASE WHEN _total_females > 0 THEN _live_births::NUMERIC / _total_females ELSE NULL END;
  _weaning_survival := CASE WHEN _live_births > 0   THEN _weaned::NUMERIC / _live_births        ELSE NULL END;
  _mortality_risk   := CASE WHEN _total_births > 0  THEN _deaths_before_wean::NUMERIC / _total_births ELSE NULL END;

  INSERT INTO public.reproductive_indices (
    district_id, species, period_start, period_end,
    total_females, total_births, live_births, deaths_before_weaning, weaned,
    lambing_kidding_rate, weaning_survival_rate, mortality_risk_rate,
    calculated_at, calculated_by
  )
  VALUES (
    _district_id, _species, _period_start, _period_end,
    COALESCE(_total_females, 0), COALESCE(_total_births, 0),
    COALESCE(_live_births, 0), COALESCE(_deaths_before_wean, 0), COALESCE(_weaned, 0),
    _lambing_rate, _weaning_survival, _mortality_risk,
    now(), auth.uid()
  )
  ON CONFLICT (district_id, breeding_center_id, species, period_start, period_end)
  DO UPDATE SET
    total_females         = EXCLUDED.total_females,
    total_births          = EXCLUDED.total_births,
    live_births           = EXCLUDED.live_births,
    deaths_before_weaning = EXCLUDED.deaths_before_weaning,
    weaned                = EXCLUDED.weaned,
    lambing_kidding_rate  = EXCLUDED.lambing_kidding_rate,
    weaning_survival_rate = EXCLUDED.weaning_survival_rate,
    mortality_risk_rate   = EXCLUDED.mortality_risk_rate,
    calculated_at         = EXCLUDED.calculated_at,
    calculated_by         = EXCLUDED.calculated_by;
END;
$$;

-- =============================================================
-- VIEW: livestock_summary
-- Flat view used by the main livestock list screen,
-- joining district and center names for display.
-- =============================================================
CREATE OR REPLACE VIEW public.livestock_summary AS
SELECT
  l.id,
  l.national_id,
  l.rfid_tag,
  l.species,
  l.breed,
  l.sex,
  l.date_of_birth,
  l.weight,
  l.greasy_fleece_weight,
  l.micron_diameter,
  l.staple_length,
  l.clean_yield_pct,
  l.inbreeding_coefficient,
  l.status,
  l.acquisition_date,
  d.name  AS district_name,
  d.code  AS district_code,
  bc.name AS center_name,
  f.full_name AS farmer_name,
  s.full_name AS sire_national_id_label,
  dm.full_name AS dam_national_id_label,
  l.notes,
  l.created_at,
  l.updated_at
FROM public.livestock l
LEFT JOIN public.districts       d  ON d.id  = l.district_id
LEFT JOIN public.breeding_centers bc ON bc.id = l.breeding_center_id
LEFT JOIN public.farmers          f  ON f.id  = l.owner_farmer_id
LEFT JOIN public.livestock        s  ON s.id  = l.sire_id
LEFT JOIN public.livestock        dm ON dm.id = l.dam_id;

-- =============================================================
-- VIEW: district_health_summary
-- Quick roll-up of disease reports per district.
-- =============================================================
CREATE OR REPLACE VIEW public.district_health_summary AS
SELECT
  d.id   AS district_id,
  d.name AS district_name,
  COUNT(w.id) FILTER (WHERE w.status = 'suspected')  AS suspected_cases,
  COUNT(w.id) FILTER (WHERE w.status = 'confirmed')  AS confirmed_cases,
  COUNT(w.id) FILTER (WHERE w.status = 'resolved')   AS resolved_cases,
  SUM(w.deaths)                                       AS total_deaths,
  MAX(w.date_detected)                                AS last_detection_date
FROM public.districts d
LEFT JOIN public.woah_disease_reports w ON w.district_id = d.id
GROUP BY d.id, d.name;
