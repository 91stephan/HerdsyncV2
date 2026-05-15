-- =============================================================
-- HerdSync V2 — TEST SEED DATA
-- Migration 14: Development / testing data only.
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING).
-- All test records are prefixed or flagged for easy cleanup.
-- DO NOT run on production.
-- =============================================================

-- ── Fix: date subtraction returns INTEGER in PG, not INTERVAL ─
-- Patch calculate_genetic_indices to remove the invalid EXTRACT call.
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
  _deaths             INTEGER;
  _sales              INTEGER;
  _slaughter          INTEGER;
  _stolen             INTEGER;
  _gifts_out          INTEGER;
  _gifts_in           INTEGER;
  _purchases          INTEGER;
  _births             INTEGER;
  _parturitions       INTEGER;
  _female_animal_days NUMERIC(12,2);
  _mortality_rate     NUMERIC(7,4);
  _offtake_rate       NUMERIC(7,4);
  _lambing_rate       NUMERIC(7,4);
  _avg_fleece         NUMERIC(6,3);
  _avg_micron         NUMERIC(5,2);
  _avg_staple         NUMERIC(5,1);
  _avg_yield          NUMERIC(5,2);
BEGIN
  SELECT COUNT(*) INTO _herd_start
  FROM public.livestock
  WHERE species = _species AND district_id = _district_id
    AND (_breeding_center_id IS NULL OR breeding_center_id = _breeding_center_id)
    AND status = 'active'
    AND (acquisition_date IS NULL OR acquisition_date <= _period_start);

  SELECT COUNT(*) INTO _herd_end
  FROM public.livestock
  WHERE species = _species AND district_id = _district_id
    AND (_breeding_center_id IS NULL OR breeding_center_id = _breeding_center_id)
    AND status = 'active'
    AND (acquisition_date IS NULL OR acquisition_date <= _period_end);

  _avg_herd := (_herd_start + _herd_end)::NUMERIC / 2.0;

  SELECT
    COUNT(*) FILTER (WHERE movement_type = 'death'),
    COUNT(*) FILTER (WHERE movement_type = 'sale'),
    COUNT(*) FILTER (WHERE movement_type = 'slaughter'),
    COUNT(*) FILTER (WHERE movement_type = 'stolen'),
    COUNT(*) FILTER (WHERE movement_type = 'gift_out'),
    COUNT(*) FILTER (WHERE movement_type = 'gift_in'),
    COUNT(*) FILTER (WHERE movement_type = 'purchase'),
    COUNT(*) FILTER (WHERE movement_type = 'birth')
  INTO _deaths, _sales, _slaughter, _stolen, _gifts_out, _gifts_in, _purchases, _births
  FROM public.livestock_movements
  WHERE species = _species AND district_id = _district_id
    AND (_breeding_center_id IS NULL OR breeding_center_id = _breeding_center_id)
    AND movement_date BETWEEN _period_start AND _period_end;

  SELECT COUNT(*) INTO _parturitions
  FROM public.birthing_records b
  JOIN public.livestock l ON l.id = b.dam_id
  WHERE l.species = _species AND b.district_id = _district_id
    AND b.birth_date BETWEEN _period_start AND _period_end;

  -- date - date returns INTEGER in PostgreSQL (no EXTRACT needed)
  SELECT COALESCE(SUM(
    GREATEST(
      (LEAST(COALESCE(removed_at::DATE, _period_end), _period_end)
       - GREATEST(COALESCE(acquisition_date, _period_start), _period_start))::INTEGER,
      0
    )
  ), 0) INTO _female_animal_days
  FROM public.livestock
  WHERE species = _species AND sex = 'female' AND district_id = _district_id
    AND (_breeding_center_id IS NULL OR breeding_center_id = _breeding_center_id)
    AND (acquisition_date IS NULL OR acquisition_date <= _period_end)
    AND (removed_at IS NULL OR removed_at::DATE >= _period_start);

  SELECT AVG(greasy_fleece_weight), AVG(micron_diameter), AVG(staple_length), AVG(clean_yield_pct)
  INTO _avg_fleece, _avg_micron, _avg_staple, _avg_yield
  FROM public.livestock
  WHERE species = _species AND district_id = _district_id
    AND (_breeding_center_id IS NULL OR breeding_center_id = _breeding_center_id)
    AND status = 'active';

  _mortality_rate := CASE WHEN _avg_herd > 0 THEN (_deaths::NUMERIC / _avg_herd) * 100 ELSE NULL END;
  _offtake_rate   := CASE WHEN _avg_herd > 0
    THEN ((_sales + _slaughter + _stolen + _gifts_out - _gifts_in - _purchases)::NUMERIC / _avg_herd) * 100
    ELSE NULL END;
  _lambing_rate   := CASE WHEN _female_animal_days > 0
    THEN (_parturitions::NUMERIC / _female_animal_days) * 365 ELSE NULL END;

  INSERT INTO public.genetic_indices (
    district_id, breeding_center_id, species, year,
    herd_size_start, herd_size_end, avg_herd_size,
    total_deaths, total_sales, total_slaughter, total_stolen,
    total_gifts_out, total_gifts_in, total_purchases, total_births,
    total_parturitions, total_female_animal_days,
    annual_mortality_rate, annual_offtake_rate, lambing_kidding_rate,
    avg_greasy_fleece_weight, avg_micron_diameter, avg_staple_length, avg_clean_yield_pct,
    calculated_at, calculated_by
  ) VALUES (
    _district_id, _breeding_center_id, _species, _year,
    _herd_start, _herd_end, _avg_herd,
    COALESCE(_deaths,0), COALESCE(_sales,0), COALESCE(_slaughter,0), COALESCE(_stolen,0),
    COALESCE(_gifts_out,0), COALESCE(_gifts_in,0), COALESCE(_purchases,0), COALESCE(_births,0),
    COALESCE(_parturitions,0), _female_animal_days,
    _mortality_rate, _offtake_rate, _lambing_rate,
    _avg_fleece, _avg_micron, _avg_staple, _avg_yield,
    now(), auth.uid()
  )
  ON CONFLICT (district_id, breeding_center_id, species, year) DO UPDATE SET
    herd_size_start = EXCLUDED.herd_size_start, herd_size_end = EXCLUDED.herd_size_end,
    avg_herd_size = EXCLUDED.avg_herd_size, total_deaths = EXCLUDED.total_deaths,
    total_sales = EXCLUDED.total_sales, total_slaughter = EXCLUDED.total_slaughter,
    total_stolen = EXCLUDED.total_stolen, total_gifts_out = EXCLUDED.total_gifts_out,
    total_gifts_in = EXCLUDED.total_gifts_in, total_purchases = EXCLUDED.total_purchases,
    total_births = EXCLUDED.total_births, total_parturitions = EXCLUDED.total_parturitions,
    total_female_animal_days = EXCLUDED.total_female_animal_days,
    annual_mortality_rate = EXCLUDED.annual_mortality_rate,
    annual_offtake_rate = EXCLUDED.annual_offtake_rate,
    lambing_kidding_rate = EXCLUDED.lambing_kidding_rate,
    avg_greasy_fleece_weight = EXCLUDED.avg_greasy_fleece_weight,
    avg_micron_diameter = EXCLUDED.avg_micron_diameter,
    avg_staple_length = EXCLUDED.avg_staple_length,
    avg_clean_yield_pct = EXCLUDED.avg_clean_yield_pct,
    calculated_at = EXCLUDED.calculated_at, calculated_by = EXCLUDED.calculated_by;
END;
$$;

-- ── Test farmers ─────────────────────────────────────────────
INSERT INTO public.farmers (id, full_name, national_id, village, district_id, phone, notes)
VALUES
  ('11111111-0001-0000-0000-000000000001',
   'Thabo Mokoena', '420000000001', 'Ha Mokoena',
   (SELECT id FROM public.districts WHERE code = 'QUT'), '+26622110001', 'TEST_RECORD'),
  ('11111111-0001-0000-0000-000000000002',
   'Lineo Ntlhoki', '420000000002', 'Ha Ntlhoki',
   (SELECT id FROM public.districts WHERE code = 'MOK'), '+26622110002', 'TEST_RECORD'),
  ('11111111-0001-0000-0000-000000000003',
   'Mothusi Letsie', '420000000003', 'Ha Letsie',
   (SELECT id FROM public.districts WHERE code = 'MOH'), '+26622110003', 'TEST_RECORD'),
  ('11111111-0001-0000-0000-000000000004',
   'Palesa Sefali', '420000000004', 'Ha Sefali',
   (SELECT id FROM public.districts WHERE code = 'LER'), '+26622110004', 'TEST_RECORD'),
  ('11111111-0001-0000-0000-000000000005',
   'Mpho Ramohlanka', '420000000005', 'Ha Ramohlanka',
   (SELECT id FROM public.districts WHERE code = 'MAS'), '+26622110005', 'TEST_RECORD')
ON CONFLICT (id) DO NOTHING;

-- ── Test livestock — sires (Merino rams) ─────────────────────
INSERT INTO public.livestock (
  id, national_id, rfid_tag, species, breed, sex,
  date_of_birth, weight, greasy_fleece_weight, micron_diameter,
  staple_length, clean_yield_pct, generation_number, inbreeding_coefficient,
  district_id, breeding_center_id, status, acquisition_date, notes
) VALUES
  ('22222222-0001-0000-0000-000000000001',
   '426000000000001', 'QUT-RAM-001', 'merino_sheep', 'SA Merino', 'male',
   '2021-03-15', 89.5, 6.2, 17.8, 9.5, 68.0, 1, 0.0,
   (SELECT id FROM public.districts WHERE code = 'QUT'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Quthing%'),
   'active', '2021-04-01', 'TEST_RECORD'),

  ('22222222-0001-0000-0000-000000000002',
   '426000000000002', 'MOK-RAM-001', 'merino_sheep', 'SA Merino', 'male',
   '2020-08-10', 92.0, 6.8, 16.5, 10.2, 71.5, 2, 0.0,
   (SELECT id FROM public.districts WHERE code = 'MOK'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Mokhotlong%'),
   'active', '2020-09-01', 'TEST_RECORD'),

  ('22222222-0001-0000-0000-000000000003',
   '426000000000003', 'MOH-BUCK-001', 'angora_goat', 'SA Angora', 'male',
   '2021-06-20', 72.0, NULL, 26.5, 12.0, 80.0, 1, 0.0,
   (SELECT id FROM public.districts WHERE code = 'MOH'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Angora%'),
   'active', '2021-07-01', 'TEST_RECORD')
ON CONFLICT (id) DO NOTHING;

-- ── Test livestock — ewes / does (breeding females) ──────────
INSERT INTO public.livestock (
  id, national_id, rfid_tag, species, breed, sex,
  date_of_birth, weight, greasy_fleece_weight, micron_diameter,
  staple_length, clean_yield_pct, generation_number, inbreeding_coefficient,
  sire_id, district_id, breeding_center_id, status, acquisition_date, notes
) VALUES
  ('22222222-0002-0000-0000-000000000001',
   '426000000000004', 'QUT-EWE-001', 'merino_sheep', 'SA Merino', 'female',
   '2022-04-10', 58.0, 4.8, 18.2, 8.8, 66.0, 2, 0.031,
   '22222222-0001-0000-0000-000000000001',
   (SELECT id FROM public.districts WHERE code = 'QUT'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Quthing%'),
   'active', '2022-05-01', 'TEST_RECORD'),

  ('22222222-0002-0000-0000-000000000002',
   '426000000000005', 'QUT-EWE-002', 'merino_sheep', 'SA Merino', 'female',
   '2022-05-15', 55.5, 4.5, 19.1, 8.5, 64.5, 2, 0.025,
   '22222222-0001-0000-0000-000000000001',
   (SELECT id FROM public.districts WHERE code = 'QUT'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Quthing%'),
   'active', '2022-06-01', 'TEST_RECORD'),

  ('22222222-0002-0000-0000-000000000003',
   '426000000000006', 'MOK-EWE-001', 'merino_sheep', 'SA Merino', 'female',
   '2021-09-05', 61.0, 5.2, 17.0, 9.8, 70.0, 2, 0.0,
   '22222222-0001-0000-0000-000000000002',
   (SELECT id FROM public.districts WHERE code = 'MOK'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Mokhotlong%'),
   'active', '2021-10-01', 'TEST_RECORD'),

  ('22222222-0002-0000-0000-000000000004',
   '426000000000007', 'MOH-DOE-001', 'angora_goat', 'SA Angora', 'female',
   '2022-01-20', 48.0, NULL, 27.2, 11.5, 78.5, 1, 0.0,
   '22222222-0001-0000-0000-000000000003',
   (SELECT id FROM public.districts WHERE code = 'MOH'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Angora%'),
   'active', '2022-02-01', 'TEST_RECORD')
ON CONFLICT (id) DO NOTHING;

-- ── Test livestock — offspring / general herd ─────────────────
INSERT INTO public.livestock (
  id, national_id, rfid_tag, species, breed, sex,
  date_of_birth, weight, greasy_fleece_weight, micron_diameter,
  staple_length, clean_yield_pct, generation_number, inbreeding_coefficient,
  sire_id, dam_id, district_id, breeding_center_id, status, acquisition_date, notes
) VALUES
  ('22222222-0003-0000-0000-000000000001',
   '426000000000008', 'QUT-LAMB-001', 'merino_sheep', 'SA Merino', 'female',
   '2023-08-12', 42.0, 3.9, 17.5, 8.2, 65.0, 3, 0.062,
   '22222222-0001-0000-0000-000000000001',
   '22222222-0002-0000-0000-000000000001',
   (SELECT id FROM public.districts WHERE code = 'QUT'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Quthing%'),
   'active', '2023-08-12', 'TEST_RECORD'),

  ('22222222-0003-0000-0000-000000000002',
   '426000000000009', 'QUT-LAMB-002', 'merino_sheep', 'SA Merino', 'male',
   '2023-08-14', 45.5, NULL, NULL, NULL, NULL, 3, 0.062,
   '22222222-0001-0000-0000-000000000001',
   '22222222-0002-0000-0000-000000000002',
   (SELECT id FROM public.districts WHERE code = 'QUT'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Quthing%'),
   'active', '2023-08-14', 'TEST_RECORD'),

  -- Culled animal from farmer
  ('22222222-0003-0000-0000-000000000003',
   '426000000000010', 'FARM-CULL-001', 'merino_sheep', 'Mixed', 'male',
   '2019-05-10', 38.0, 2.1, 24.5, 6.0, 55.0, 0, 0.0,
   NULL, NULL,
   (SELECT id FROM public.districts WHERE code = 'QUT'),
   NULL,
   'culled', '2019-06-01', 'TEST_RECORD'),

  -- Deceased animal
  ('22222222-0003-0000-0000-000000000004',
   '426000000000011', 'MOK-EWE-DEAD', 'merino_sheep', 'SA Merino', 'female',
   '2020-11-01', 52.0, 4.1, 18.8, 8.9, 67.0, 2, 0.0,
   '22222222-0001-0000-0000-000000000002', NULL,
   (SELECT id FROM public.districts WHERE code = 'MOK'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Mokhotlong%'),
   'deceased', '2020-12-01', 'TEST_RECORD')
ON CONFLICT (id) DO NOTHING;

-- ── Build pedigree cache for test offspring ───────────────────
SELECT public.build_pedigree_cache('22222222-0003-0000-0000-000000000001');
SELECT public.build_pedigree_cache('22222222-0003-0000-0000-000000000002');

-- ── Test breeding records ─────────────────────────────────────
INSERT INTO public.breeding_records (
  id, sire_id, dam_id, breeding_center_id, district_id,
  mating_date, expected_birth_date, outcome
) VALUES
  ('33333333-0001-0000-0000-000000000001',
   '22222222-0001-0000-0000-000000000001',
   '22222222-0002-0000-0000-000000000001',
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Quthing%'),
   (SELECT id FROM public.districts WHERE code = 'QUT'),
   '2023-03-15', '2023-08-10', 'successful'),

  ('33333333-0001-0000-0000-000000000002',
   '22222222-0001-0000-0000-000000000001',
   '22222222-0002-0000-0000-000000000002',
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Quthing%'),
   (SELECT id FROM public.districts WHERE code = 'QUT'),
   '2023-03-18', '2023-08-13', 'successful'),

  ('33333333-0001-0000-0000-000000000003',
   '22222222-0001-0000-0000-000000000002',
   '22222222-0002-0000-0000-000000000003',
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Mokhotlong%'),
   (SELECT id FROM public.districts WHERE code = 'MOK'),
   '2024-01-10', '2024-06-08', 'in_progress')
ON CONFLICT (sire_id, dam_id, mating_date) DO NOTHING;

-- ── Test birthing records ─────────────────────────────────────
INSERT INTO public.birthing_records (
  id, breeding_record_id, dam_id, sire_id, offspring_id,
  birth_date, birth_weight, alive, district_id, breeding_center_id
) VALUES
  ('44444444-0001-0000-0000-000000000001',
   '33333333-0001-0000-0000-000000000001',
   '22222222-0002-0000-0000-000000000001',
   '22222222-0001-0000-0000-000000000001',
   '22222222-0003-0000-0000-000000000001',
   '2023-08-12', 4.8, true,
   (SELECT id FROM public.districts WHERE code = 'QUT'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Quthing%')),

  ('44444444-0001-0000-0000-000000000002',
   '33333333-0001-0000-0000-000000000002',
   '22222222-0002-0000-0000-000000000002',
   '22222222-0001-0000-0000-000000000001',
   '22222222-0003-0000-0000-000000000002',
   '2023-08-14', 5.1, true,
   (SELECT id FROM public.districts WHERE code = 'QUT'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Quthing%'))
ON CONFLICT DO NOTHING;

-- ── Test livestock movements (2025 calendar year) ─────────────
INSERT INTO public.livestock_movements (
  livestock_id, species, sex, movement_type, movement_date,
  quantity, district_id, breeding_center_id, notes
) VALUES
  -- Deaths
  ('22222222-0003-0000-0000-000000000004', 'merino_sheep', 'female',
   'death', '2025-02-14', 1,
   (SELECT id FROM public.districts WHERE code = 'MOK'), NULL, 'TEST_RECORD'),
  -- Sales
  ('22222222-0003-0000-0000-000000000002', 'merino_sheep', 'male',
   'sale', '2025-05-01', 1,
   (SELECT id FROM public.districts WHERE code = 'QUT'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Quthing%'), 'TEST_RECORD'),
  -- Births
  ('22222222-0003-0000-0000-000000000001', 'merino_sheep', 'female',
   'birth', '2023-08-12', 1,
   (SELECT id FROM public.districts WHERE code = 'QUT'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Quthing%'), 'TEST_RECORD'),
  ('22222222-0003-0000-0000-000000000002', 'merino_sheep', 'male',
   'birth', '2023-08-14', 1,
   (SELECT id FROM public.districts WHERE code = 'QUT'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Quthing%'), 'TEST_RECORD'),
  -- Gift out (to farmer)
  (NULL, 'merino_sheep', 'male',
   'gift_out', '2025-03-10', 1,
   (SELECT id FROM public.districts WHERE code = 'QUT'), NULL, 'TEST_RECORD')
ON CONFLICT DO NOTHING;

-- ── Test culling exchange records ─────────────────────────────
INSERT INTO public.culling_exchange_records (
  id, farmer_id, district_id, breeding_center_id,
  culled_animal_id, culled_animal_species, culled_animal_breed,
  culled_animal_tag, culling_reason, replacement_type,
  status, scheduled_date, collection_date, replacement_date
) VALUES
  ('55555555-0001-0000-0000-000000000001',
   '11111111-0001-0000-0000-000000000001',
   (SELECT id FROM public.districts WHERE code = 'QUT'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Quthing%'),
   '22222222-0003-0000-0000-000000000003',
   'merino_sheep', 'Mixed', 'FARM-CULL-001',
   'Low fiber yield — micron >24µm', 'merino_ram',
   'completed', '2025-01-15', '2025-01-20', '2025-01-20'),

  ('55555555-0001-0000-0000-000000000002',
   '11111111-0001-0000-0000-000000000002',
   (SELECT id FROM public.districts WHERE code = 'MOK'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Mokhotlong%'),
   NULL, 'merino_sheep', 'Mixed', 'FARM-TAG-009',
   'Poor conformation', 'merino_ram',
   'collected', '2025-04-01', '2025-04-05', NULL),

  ('55555555-0001-0000-0000-000000000003',
   '11111111-0001-0000-0000-000000000003',
   (SELECT id FROM public.districts WHERE code = 'MOH'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Angora%'),
   NULL, 'angora_goat', 'Mixed', 'FARM-TAG-020',
   'Low mohair yield', 'angora_buck',
   'scheduled', '2025-06-10', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ── Test health records ───────────────────────────────────────
INSERT INTO public.health_records (
  livestock_id, district_id, breeding_center_id,
  event_date, event_type, diagnosis, treatment, medication,
  dosage, next_followup_date, notes
) VALUES
  ('22222222-0001-0000-0000-000000000001',
   (SELECT id FROM public.districts WHERE code = 'QUT'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Quthing%'),
   '2025-01-10', 'examination', 'Healthy, annual check', NULL, NULL,
   NULL, '2026-01-10', 'TEST_RECORD'),

  ('22222222-0002-0000-0000-000000000003',
   (SELECT id FROM public.districts WHERE code = 'MOK'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Mokhotlong%'),
   '2025-02-20', 'treatment', 'Footrot', 'Hoof trimming + antibiotic',
   'Oxytetracycline', '5ml IM', '2025-03-06', 'TEST_RECORD'),

  ('22222222-0002-0000-0000-000000000004',
   (SELECT id FROM public.districts WHERE code = 'MOH'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Angora%'),
   '2025-03-05', 'vaccination', NULL, 'Pasteurella vaccine',
   'Multivax-P', '2ml SC', '2025-09-05', 'TEST_RECORD')
ON CONFLICT DO NOTHING;

-- ── Test vaccination records ──────────────────────────────────
INSERT INTO public.vaccination_records (
  livestock_id, vaccine_name, disease_target,
  vaccination_date, batch_number, next_due_date
) VALUES
  ('22222222-0001-0000-0000-000000000001',
   'Multivax-P Plus', 'Pulpy kidney, Pasteurella, Clostridial',
   '2025-01-10', 'MV-2025-001', '2025-07-10'),
  ('22222222-0002-0000-0000-000000000001',
   'Multivax-P Plus', 'Pulpy kidney, Pasteurella, Clostridial',
   '2025-01-15', 'MV-2025-001', '2025-07-15'),
  ('22222222-0002-0000-0000-000000000004',
   'Multivax-P', 'Pasteurella',
   '2025-03-05', 'MV-2025-003', '2025-09-05')
ON CONFLICT DO NOTHING;

-- ── Test WOAH disease reports ─────────────────────────────────
INSERT INTO public.woah_disease_reports (
  id, district_id, breeding_center_id,
  disease_name, woah_disease_code, species_affected,
  date_detected, date_reported, animals_at_risk,
  cases_confirmed, deaths, status, containment_measures,
  lab_confirmation, notes
) VALUES
  ('66666666-0001-0000-0000-000000000001',
   (SELECT id FROM public.districts WHERE code = 'MOK'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Mokhotlong%'),
   'Brucellosis', 'BRUCEL', 'merino_sheep',
   '2025-03-01', '2025-03-02', 85, 3, 0,
   'confirmed', 'Quarantine of affected animals; blood testing of full flock',
   true, 'TEST_RECORD'),

  ('66666666-0001-0000-0000-000000000002',
   (SELECT id FROM public.districts WHERE code = 'QUT'),
   (SELECT id FROM public.breeding_centers WHERE name LIKE '%Quthing%'),
   'Foot-and-Mouth Disease', 'FMD', 'merino_sheep',
   '2025-04-10', '2025-04-10', 120, 1, 0,
   'suspected', 'Movement restrictions imposed; notification sent to district vet',
   false, 'TEST_RECORD')
ON CONFLICT (id) DO NOTHING;

-- ── Pre-calculate genetic indices for testing ─────────────────
SELECT public.calculate_genetic_indices(
  (SELECT id FROM public.districts WHERE code = 'QUT'),
  'merino_sheep', 2025, NULL
);
SELECT public.calculate_genetic_indices(
  (SELECT id FROM public.districts WHERE code = 'MOK'),
  'merino_sheep', 2025, NULL
);
SELECT public.calculate_genetic_indices(
  (SELECT id FROM public.districts WHERE code = 'MOH'),
  'angora_goat', 2025, NULL
);
