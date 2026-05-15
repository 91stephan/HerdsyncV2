-- =============================================================
-- HerdSync V2 — Lesotho National Breeding System
-- Migration 1: ENUM types
-- =============================================================

-- Staff roles within the Ministry system
CREATE TYPE public.staff_role AS ENUM (
  'system_admin',
  'center_manager',
  'district_officer',
  'field_worker',
  'veterinarian'
);

-- Livestock species (primary focus: Merino sheep & Angora goats)
CREATE TYPE public.livestock_species AS ENUM (
  'merino_sheep',
  'angora_goat',
  'cattle',
  'other'
);

-- Biological sex
CREATE TYPE public.livestock_sex AS ENUM (
  'male',
  'female'
);

-- Full lifecycle status of an animal
CREATE TYPE public.livestock_status AS ENUM (
  'active',
  'culled',
  'deceased',
  'sold',
  'transferred',
  'quarantined'
);

-- Document categories (Lesotho / Ministry-specific)
CREATE TYPE public.document_category AS ENUM (
  'animal_registration',
  'movement_permit',
  'health_certificate',
  'vaccination_record',
  'breeding_certificate',
  'import_export_permit',
  'woah_report',
  'efi_certificate',
  'training_record',
  'ministry_directive',
  'other'
);

-- Offline record sync states
CREATE TYPE public.sync_status AS ENUM (
  'pending',
  'synced',
  'conflict',
  'failed'
);

-- WOAH disease report lifecycle
CREATE TYPE public.woah_disease_status AS ENUM (
  'suspected',
  'confirmed',
  'resolved'
);

-- Culling and exchange program workflow states
CREATE TYPE public.culling_exchange_status AS ENUM (
  'scheduled',
  'collected',
  'replaced',
  'completed',
  'cancelled'
);

-- Severity levels for incidents
CREATE TYPE public.incident_severity AS ENUM (
  'minor',
  'moderate',
  'serious',
  'critical'
);

-- Task priority
CREATE TYPE public.task_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- Task lifecycle
CREATE TYPE public.task_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'cancelled'
);

-- Breeding event outcomes
CREATE TYPE public.breeding_outcome AS ENUM (
  'in_progress',
  'successful',
  'unsuccessful'
);

-- External system sync states
CREATE TYPE public.external_sync_status AS ENUM (
  'pending',
  'success',
  'failed'
);
