-- =============================================================
-- HerdSync V2 — Migration 15: Fix Security Definer Views
-- Recreate livestock_summary and district_health_summary with
-- SECURITY INVOKER so Postgres RLS policies apply to the
-- *querying user*, not the view creator.
-- PostgreSQL 15+ supports the WITH (security_invoker = true) option.
-- =============================================================

CREATE OR REPLACE VIEW public.livestock_summary
WITH (security_invoker = true)
AS
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
  COALESCE(s.rfid_tag,  s.national_id)  AS sire_label,
  COALESCE(dm.rfid_tag, dm.national_id) AS dam_label,
  l.notes,
  l.created_at,
  l.updated_at
FROM public.livestock l
LEFT JOIN public.districts        d  ON d.id  = l.district_id
LEFT JOIN public.breeding_centers bc ON bc.id = l.breeding_center_id
LEFT JOIN public.farmers          f  ON f.id  = l.owner_farmer_id
LEFT JOIN public.livestock        s  ON s.id  = l.sire_id
LEFT JOIN public.livestock        dm ON dm.id = l.dam_id;

-- =============================================================
-- VIEW: district_health_summary  (SECURITY INVOKER)
-- =============================================================
CREATE OR REPLACE VIEW public.district_health_summary
WITH (security_invoker = true)
AS
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
