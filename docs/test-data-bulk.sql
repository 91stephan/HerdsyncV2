-- =============================================================
-- HerdSync V2 — BULK TEST / DEMO DATA
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor).
-- Safe to run multiple times (ON CONFLICT DO NOTHING everywhere).
-- All demo records carry notes = 'DEMO_DATA' for easy cleanup.
-- =============================================================

-- ── 1. Extra farmers ─────────────────────────────────────────
INSERT INTO public.farmers (id, full_name, national_id, village, district_id, phone, notes) VALUES
  ('aaaaaaaa-0001-0000-0000-000000000001','Thabang Molefe','420000001001','Ha Molefe',
   (SELECT id FROM districts WHERE code='QUT'),'+26658110001','DEMO_DATA'),
  ('aaaaaaaa-0001-0000-0000-000000000002','Mamello Molapo','420000001002','Ha Maope',
   (SELECT id FROM districts WHERE code='MOK'),'+26658110002','DEMO_DATA'),
  ('aaaaaaaa-0001-0000-0000-000000000003','Retselisitsoe Hlaoli','420000001003','Ha Hlaoli',
   (SELECT id FROM districts WHERE code='MOH'),'+26658110003','DEMO_DATA'),
  ('aaaaaaaa-0001-0000-0000-000000000004','Sello Rakotsoane','420000001004','Ha Sekake',
   (SELECT id FROM districts WHERE code='THA'),'+26658110004','DEMO_DATA'),
  ('aaaaaaaa-0001-0000-0000-000000000005','Nthabi Tlhakola','420000001005','Ha Makhaleng',
   (SELECT id FROM districts WHERE code='MOH'),'+26658110005','DEMO_DATA'),
  ('aaaaaaaa-0001-0000-0000-000000000006','Lisema Mofokeng','420000001006','Ha Mafube',
   (SELECT id FROM districts WHERE code='LER'),'+26658110006','DEMO_DATA'),
  ('aaaaaaaa-0001-0000-0000-000000000007','Bokang Sekhobe','420000001007','Ha Sekhobe',
   (SELECT id FROM districts WHERE code='MAS'),'+26658110007','DEMO_DATA'),
  ('aaaaaaaa-0001-0000-0000-000000000008','Puseletso Ntsane','420000001008','Ha Ntsane',
   (SELECT id FROM districts WHERE code='BER'),'+26658110008','DEMO_DATA'),
  ('aaaaaaaa-0001-0000-0000-000000000009','Moteane Letsie','420000001009','Ha Letsie',
   (SELECT id FROM districts WHERE code='BUH'),'+26658110009','DEMO_DATA'),
  ('aaaaaaaa-0001-0000-0000-000000000010','Kopano Mokhachane','420000001010','Ha Nkau',
   (SELECT id FROM districts WHERE code='QAC'),'+26658110010','DEMO_DATA')
ON CONFLICT (id) DO NOTHING;

-- ── 2. Merino sheep — Quthing (40 animals) ───────────────────
DO $$
DECLARE
  _dist UUID := (SELECT id FROM public.districts WHERE code='QUT');
  _bc   UUID := (SELECT id FROM public.breeding_centers WHERE name ILIKE '%Quthing%' LIMIT 1);
  _i    INTEGER;
BEGIN
  FOR _i IN 1..40 LOOP
    INSERT INTO public.livestock (
      national_id, rfid_tag, species, breed, sex,
      date_of_birth, weight, greasy_fleece_weight, micron_diameter,
      staple_length, clean_yield_pct, generation_number, inbreeding_coefficient,
      district_id, breeding_center_id, status, acquisition_date, notes
    ) VALUES (
      '4260001' || LPAD(_i::TEXT,7,'0'),
      'QUT-M-' || LPAD(_i::TEXT,4,'0'),
      'merino_sheep',
      'SA Merino',
      CASE WHEN _i % 3 = 0 THEN 'male' ELSE 'female' END,
      (DATE '2020-01-01' + (_i * 37) * INTERVAL '1 day')::DATE,
      50 + (_i % 30)::NUMERIC + random()::NUMERIC,
      4.5 + (_i % 3)::NUMERIC * 0.5,
      16.5 + (_i % 6)::NUMERIC * 0.3,
      8.5 + (_i % 4)::NUMERIC * 0.5,
      63 + (_i % 10)::NUMERIC,
      (_i % 4) + 1,
      ROUND((random() * 0.08)::NUMERIC, 4),
      _dist, _bc, 'active',
      (DATE '2020-02-01' + (_i * 37) * INTERVAL '1 day')::DATE,
      'DEMO_DATA'
    )
    ON CONFLICT (national_id) DO NOTHING;
  END LOOP;
END;
$$;

-- ── 3. Angora goats — Mohale's Hoek (30 animals) ─────────────
DO $$
DECLARE
  _dist UUID := (SELECT id FROM public.districts WHERE code='MOH');
  _bc   UUID := (SELECT id FROM public.breeding_centers WHERE name ILIKE '%Angora%' LIMIT 1);
  _i    INTEGER;
BEGIN
  FOR _i IN 1..30 LOOP
    INSERT INTO public.livestock (
      national_id, rfid_tag, species, breed, sex,
      date_of_birth, weight, micron_diameter,
      staple_length, clean_yield_pct, generation_number, inbreeding_coefficient,
      district_id, breeding_center_id, status, acquisition_date, notes
    ) VALUES (
      '4260002' || LPAD(_i::TEXT,7,'0'),
      'MOH-A-' || LPAD(_i::TEXT,4,'0'),
      'angora_goat',
      'SA Angora',
      CASE WHEN _i % 4 = 0 THEN 'male' ELSE 'female' END,
      (DATE '2021-01-01' + (_i * 41) * INTERVAL '1 day')::DATE,
      44 + (_i % 20)::NUMERIC,
      24 + (_i % 8)::NUMERIC * 0.4,
      10 + (_i % 5)::NUMERIC * 0.6,
      76 + (_i % 8)::NUMERIC,
      (_i % 3) + 1,
      ROUND((random() * 0.06)::NUMERIC, 4),
      _dist, _bc, 'active',
      (DATE '2021-02-01' + (_i * 41) * INTERVAL '1 day')::DATE,
      'DEMO_DATA'
    )
    ON CONFLICT (national_id) DO NOTHING;
  END LOOP;
END;
$$;

-- ── 4. Cattle — Mokhotlong (25 animals) ──────────────────────
DO $$
DECLARE
  _dist UUID := (SELECT id FROM public.districts WHERE code='MOK');
  _bc   UUID := (SELECT id FROM public.breeding_centers WHERE name ILIKE '%Mokhotlong%' LIMIT 1);
  _i    INTEGER;
BEGIN
  FOR _i IN 1..25 LOOP
    INSERT INTO public.livestock (
      national_id, rfid_tag, species, breed, sex,
      date_of_birth, weight,
      generation_number, inbreeding_coefficient,
      district_id, breeding_center_id, status, acquisition_date, notes
    ) VALUES (
      '4260003' || LPAD(_i::TEXT,7,'0'),
      'MOK-C-' || LPAD(_i::TEXT,4,'0'),
      'cattle',
      'Nguni',
      CASE WHEN _i % 5 = 0 THEN 'male' ELSE 'female' END,
      (DATE '2019-01-01' + (_i * 53) * INTERVAL '1 day')::DATE,
      350 + (_i % 100)::NUMERIC,
      (_i % 3) + 1,
      ROUND((random() * 0.04)::NUMERIC, 4),
      _dist, _bc, 'active',
      (DATE '2019-02-01' + (_i * 53) * INTERVAL '1 day')::DATE,
      'DEMO_DATA'
    )
    ON CONFLICT (national_id) DO NOTHING;
  END LOOP;
END;
$$;

-- ── 5. Horses — Thaba-Tseka (15 animals) ─────────────────────
DO $$
DECLARE
  _dist UUID := (SELECT id FROM public.districts WHERE code='THA');
  _i    INTEGER;
BEGIN
  FOR _i IN 1..15 LOOP
    INSERT INTO public.livestock (
      national_id, rfid_tag, species, breed, sex,
      date_of_birth, weight,
      generation_number, inbreeding_coefficient,
      district_id, status, acquisition_date, notes
    ) VALUES (
      '4260004' || LPAD(_i::TEXT,7,'0'),
      'THA-H-' || LPAD(_i::TEXT,4,'0'),
      'horse',
      'Basotho Pony',
      CASE WHEN _i % 3 = 0 THEN 'male' ELSE 'female' END,
      (DATE '2018-01-01' + (_i * 61) * INTERVAL '1 day')::DATE,
      250 + (_i % 80)::NUMERIC,
      1, 0.0,
      _dist, 'active',
      (DATE '2018-02-01' + (_i * 61) * INTERVAL '1 day')::DATE,
      'DEMO_DATA'
    )
    ON CONFLICT (national_id) DO NOTHING;
  END LOOP;
END;
$$;

-- ── 6. Donkeys — Berea & Leribe (10 each) ────────────────────
DO $$
DECLARE
  _dist_ber UUID := (SELECT id FROM public.districts WHERE code='BER');
  _dist_ler UUID := (SELECT id FROM public.districts WHERE code='LER');
  _i INTEGER;
BEGIN
  FOR _i IN 1..10 LOOP
    INSERT INTO public.livestock (
      national_id, rfid_tag, species, breed, sex,
      date_of_birth, weight, generation_number, inbreeding_coefficient,
      district_id, status, acquisition_date, notes
    ) VALUES
    (
      '4260005' || LPAD(_i::TEXT,7,'0'),
      'BER-D-' || LPAD(_i::TEXT,4,'0'),
      'donkey', 'Domestic Donkey',
      CASE WHEN _i % 2 = 0 THEN 'male' ELSE 'female' END,
      (DATE '2017-06-01' + (_i * 45) * INTERVAL '1 day')::DATE,
      160 + (_i % 40)::NUMERIC, 1, 0.0,
      _dist_ber, 'active',
      (DATE '2017-07-01' + (_i * 45) * INTERVAL '1 day')::DATE,
      'DEMO_DATA'
    ),
    (
      '4260006' || LPAD(_i::TEXT,7,'0'),
      'LER-D-' || LPAD(_i::TEXT,4,'0'),
      'donkey', 'Domestic Donkey',
      CASE WHEN _i % 2 = 0 THEN 'female' ELSE 'male' END,
      (DATE '2018-03-01' + (_i * 45) * INTERVAL '1 day')::DATE,
      155 + (_i % 40)::NUMERIC, 1, 0.0,
      _dist_ler, 'active',
      (DATE '2018-04-01' + (_i * 45) * INTERVAL '1 day')::DATE,
      'DEMO_DATA'
    )
    ON CONFLICT (national_id) DO NOTHING;
  END LOOP;
END;
$$;

-- ── 7. Livestock movements (2025 calendar year) ───────────────
INSERT INTO public.livestock_movements
  (species, sex, movement_type, movement_date, quantity, district_id, notes)
SELECT
  CASE (gs % 5)
    WHEN 0 THEN 'merino_sheep'
    WHEN 1 THEN 'angora_goat'
    WHEN 2 THEN 'cattle'
    WHEN 3 THEN 'horse'
    ELSE 'donkey'
  END,
  CASE WHEN gs % 2 = 0 THEN 'female' ELSE 'male' END,
  CASE (gs % 6)
    WHEN 0 THEN 'death'
    WHEN 1 THEN 'sale'
    WHEN 2 THEN 'birth'
    WHEN 3 THEN 'purchase'
    WHEN 4 THEN 'gift_in'
    ELSE 'slaughter'
  END,
  (DATE '2025-01-01' + gs * 3 * INTERVAL '1 day')::DATE,
  1,
  (SELECT id FROM public.districts ORDER BY code LIMIT 1 OFFSET (gs % 10)),
  'DEMO_DATA'
FROM generate_series(1, 120) gs
ON CONFLICT DO NOTHING;

-- ── 8. WOAH disease reports ───────────────────────────────────
INSERT INTO public.woah_disease_reports
  (id, district_id, disease_name, species_affected, date_detected,
   date_reported, status, cases, deaths, description, reporter_id)
VALUES
  ('bbbbbbbb-0001-0000-0000-000000000001',
   (SELECT id FROM public.districts WHERE code='MOK'),
   'Sheep Scab (Psoroptic mange)','merino_sheep','2025-02-10','2025-02-11',
   'resolved',18,0,'Confirmed scab outbreak in Mokhotlong valley, treated with acaricide dip.',
   (SELECT id FROM auth.users LIMIT 1)),
  ('bbbbbbbb-0001-0000-0000-000000000002',
   (SELECT id FROM public.districts WHERE code='QUT'),
   'Foot and Mouth Disease','cattle','2025-03-22','2025-03-23',
   'resolved',7,1,'Suspected FMD cluster reported by 3 farmers. Quarantine enforced.',
   (SELECT id FROM auth.users LIMIT 1)),
  ('bbbbbbbb-0001-0000-0000-000000000003',
   (SELECT id FROM public.districts WHERE code='MOH'),
   'Contagious Ecthyma (Orf)','angora_goat','2025-04-05','2025-04-06',
   'confirmed',22,0,'Active orf lesions on 22 Angora does. Vaccination underway.',
   (SELECT id FROM auth.users LIMIT 1)),
  ('bbbbbbbb-0001-0000-0000-000000000004',
   (SELECT id FROM public.districts WHERE code='THA'),
   'African Horse Sickness','horse','2025-04-18','2025-04-18',
   'confirmed',4,2,'Two horses deceased. AHS notified to WOAH. Movement ban in place.',
   (SELECT id FROM auth.users LIMIT 1)),
  ('bbbbbbbb-0001-0000-0000-000000000005',
   (SELECT id FROM public.districts WHERE code='BER'),
   'Heartwater (Cowdriosis)','cattle','2025-05-02','2025-05-03',
   'suspected',3,0,'Three cattle with fever and nervous signs. Samples sent to lab.',
   (SELECT id FROM auth.users LIMIT 1)),
  ('bbbbbbbb-0001-0000-0000-000000000006',
   (SELECT id FROM public.districts WHERE code='LER'),
   'Brucellosis','cattle','2025-05-08','2025-05-09',
   'suspected',2,0,'Abortions in 2 cows. Blood samples taken for Brucella testing.',
   (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT (id) DO NOTHING;

-- ── 9. Culling exchange records ───────────────────────────────
INSERT INTO public.culling_exchanges
  (id, national_id, species, sex, farmer_id, district_id,
   exchange_status, scheduled_date, notes)
VALUES
  ('cccccccc-0001-0000-0000-000000000001',
   '4260001000001','merino_sheep','male',
   '11111111-0001-0000-0000-000000000001',
   (SELECT id FROM districts WHERE code='QUT'),
   'completed','2025-02-15','DEMO_DATA'),
  ('cccccccc-0001-0000-0000-000000000002',
   '4260001000008','merino_sheep','female',
   '11111111-0001-0000-0000-000000000002',
   (SELECT id FROM districts WHERE code='QUT'),
   'completed','2025-03-10','DEMO_DATA'),
  ('cccccccc-0001-0000-0000-000000000003',
   '4260002000005','angora_goat','female',
   '11111111-0001-0000-0000-000000000003',
   (SELECT id FROM districts WHERE code='MOH'),
   'replaced','2025-04-01','DEMO_DATA'),
  ('cccccccc-0001-0000-0000-000000000004',
   '4260002000012','angora_goat','male',
   'aaaaaaaa-0001-0000-0000-000000000003',
   (SELECT id FROM districts WHERE code='MOH'),
   'collected','2025-05-10','DEMO_DATA'),
  ('cccccccc-0001-0000-0000-000000000005',
   '4260003000003','cattle','female',
   'aaaaaaaa-0001-0000-0000-000000000002',
   (SELECT id FROM districts WHERE code='MOK'),
   'scheduled','2025-05-20','DEMO_DATA'),
  ('cccccccc-0001-0000-0000-000000000006',
   '4260003000009','cattle','female',
   'aaaaaaaa-0001-0000-0000-000000000004',
   (SELECT id FROM districts WHERE code='THA'),
   'scheduled','2025-05-25','DEMO_DATA'),
  ('cccccccc-0001-0000-0000-000000000007',
   '4260001000015','merino_sheep','female',
   'aaaaaaaa-0001-0000-0000-000000000005',
   (SELECT id FROM districts WHERE code='MOH'),
   'scheduled','2025-06-02','DEMO_DATA')
ON CONFLICT (id) DO NOTHING;

-- ── 10. Health / vaccination records ─────────────────────────
INSERT INTO public.health_records
  (livestock_id, event_type, event_date, diagnosis, treatment, notes)
SELECT
  l.id,
  CASE (ROW_NUMBER() OVER () % 4)
    WHEN 0 THEN 'vaccination'
    WHEN 1 THEN 'treatment'
    WHEN 2 THEN 'examination'
    ELSE 'vaccination'
  END,
  (DATE '2025-01-15' + (ROW_NUMBER() OVER () * 7) * INTERVAL '1 day')::DATE,
  CASE (ROW_NUMBER() OVER () % 4)
    WHEN 0 THEN 'Annual clostridial vaccination'
    WHEN 1 THEN 'Dip treatment for external parasites'
    WHEN 2 THEN 'Routine health examination — normal'
    ELSE 'OJD vaccination'
  END,
  CASE (ROW_NUMBER() OVER () % 4)
    WHEN 0 THEN 'Clostridial 6-in-1 vaccine 2ml IM'
    WHEN 1 THEN 'Triatix dip bath, 1:1000 dilution'
    WHEN 2 THEN NULL
    ELSE 'Gudair vaccine 1ml SC'
  END,
  'DEMO_DATA'
FROM public.livestock l
WHERE l.notes = 'DEMO_DATA'
LIMIT 80
ON CONFLICT DO NOTHING;

-- ── 11. Genetic indices (pre-calculated for 2024) ─────────────
SELECT public.calculate_genetic_indices(
  (SELECT id FROM public.districts WHERE code='QUT'),
  'merino_sheep', 2024);

SELECT public.calculate_genetic_indices(
  (SELECT id FROM public.districts WHERE code='MOH'),
  'angora_goat', 2024);

SELECT public.calculate_genetic_indices(
  (SELECT id FROM public.districts WHERE code='MOK'),
  'cattle', 2024);

-- ── Done ──────────────────────────────────────────────────────
-- To clean up all demo data run:
-- DELETE FROM public.livestock_movements WHERE notes = 'DEMO_DATA';
-- DELETE FROM public.health_records WHERE notes = 'DEMO_DATA';
-- DELETE FROM public.culling_exchanges WHERE notes = 'DEMO_DATA';
-- DELETE FROM public.woah_disease_reports WHERE notes = 'DEMO_DATA' OR id LIKE 'bbbbbbbb%';
-- DELETE FROM public.livestock WHERE notes = 'DEMO_DATA';
-- DELETE FROM public.farmers WHERE notes = 'DEMO_DATA';
