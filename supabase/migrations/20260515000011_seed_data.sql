-- =============================================================
-- HerdSync V2 — Lesotho National Breeding System
-- Migration 11: Seed data
--   - 10 official Lesotho districts
--   - Known National Breeding Centers
-- =============================================================

-- =============================================================
-- LESOTHO DISTRICTS
-- All 10 administrative districts of the Kingdom of Lesotho
-- =============================================================
INSERT INTO public.districts (name, code) VALUES
  ('Maseru',        'MAS'),
  ('Berea',         'BER'),
  ('Leribe',        'LER'),
  ('Butha-Buthe',   'BUT'),
  ('Mafeteng',      'MAF'),
  ('Mohale''s Hoek','MOH'),
  ('Quthing',       'QUT'),
  ('Qacha''s Nek',  'QAC'),
  ('Mokhotlong',    'MOK'),
  ('Thaba-Tseka',   'THA');

-- =============================================================
-- NATIONAL BREEDING CENTERS
-- Seeded from known MoAFS / WaMCoP project sites.
-- Additional centers can be added via the admin interface.
-- =============================================================
INSERT INTO public.breeding_centers (name, district_id, location, active)
VALUES
  (
    'Semonkong Merino Stud Center',
    (SELECT id FROM public.districts WHERE code = 'MAS'),
    'Semonkong, Maseru District',
    true
  ),
  (
    'Mohale''s Hoek Angora Breeding Center',
    (SELECT id FROM public.districts WHERE code = 'MOH'),
    'Mohale''s Hoek Town',
    true
  ),
  (
    'Quthing National Stud Center',
    (SELECT id FROM public.districts WHERE code = 'QUT'),
    'Quthing Town',
    true
  ),
  (
    'Mokhotlong Highland Breeding Center',
    (SELECT id FROM public.districts WHERE code = 'MOK'),
    'Mokhotlong Town',
    true
  ),
  (
    'Leribe Fiber Production Center',
    (SELECT id FROM public.districts WHERE code = 'LER'),
    'Hlotse, Leribe District',
    true
  );
