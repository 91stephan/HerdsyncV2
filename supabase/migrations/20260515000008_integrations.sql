-- =============================================================
-- HerdSync V2 — Lesotho National Breeding System
-- Migration 8: External integrations
--   - LIAMIS sync log (Lesotho Integrated Agriculture MIS)
--   - Project MIS sync log (WaMCoP)
--   - EFI export records (Ethical Fashion Initiative)
--   - Offline sync queue (field-to-server)
-- =============================================================

-- =============================================================
-- LIAMIS SYNC LOG
-- Tracks all data pushes to the Lesotho Integrated Agriculture
-- Management Information System (LIAMIS).
-- =============================================================
CREATE TABLE public.liamis_sync_log (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- 'livestock', 'health', 'movement', 'breeding', 'culling'
  sync_type        TEXT NOT NULL,
  record_ids       UUID[] NOT NULL DEFAULT '{}',
  status           public.external_sync_status NOT NULL DEFAULT 'pending',
  request_payload  JSONB,
  response_payload JSONB,
  error_message    TEXT,
  retry_count      INTEGER NOT NULL DEFAULT 0,
  synced_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  synced_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_liamis_status    ON public.liamis_sync_log (status);
CREATE INDEX idx_liamis_sync_type ON public.liamis_sync_log (sync_type);

-- =============================================================
-- PROJECT MIS SYNC LOG
-- Tracks scheduled data pushes to the WaMCoP Project MIS.
-- =============================================================
CREATE TABLE public.project_mis_sync_log (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type        TEXT NOT NULL,
  record_ids       UUID[] NOT NULL DEFAULT '{}',
  status           public.external_sync_status NOT NULL DEFAULT 'pending',
  request_payload  JSONB,
  response_payload JSONB,
  error_message    TEXT,
  retry_count      INTEGER NOT NULL DEFAULT 0,
  synced_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  synced_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mis_status    ON public.project_mis_sync_log (status);
CREATE INDEX idx_mis_sync_type ON public.project_mis_sync_log (sync_type);

-- =============================================================
-- EFI EXPORT RECORDS
-- Summarised fiber production data exports for the Ethical
-- Fashion Initiative — supports the "Basotho Brand" certification
-- for international luxury wool and mohair markets.
-- =============================================================
CREATE TABLE public.efi_export_records (
  id                        UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  district_id               UUID REFERENCES public.districts(id),
  period_start              DATE NOT NULL,
  period_end                DATE NOT NULL,
  species                   public.livestock_species NOT NULL DEFAULT 'merino_sheep',
  total_animals             INTEGER NOT NULL DEFAULT 0,
  avg_micron_diameter       NUMERIC(5,2),
  avg_staple_length         NUMERIC(5,1),
  avg_clean_yield_pct       NUMERIC(5,2),
  total_greasy_fleece_kg    NUMERIC(10,3),
  export_file_url           TEXT,
  generated_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  export_date               DATE NOT NULL DEFAULT CURRENT_DATE,
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_efi_district ON public.efi_export_records (district_id);
CREATE INDEX idx_efi_period   ON public.efi_export_records (period_start, period_end);

-- =============================================================
-- OFFLINE SYNC QUEUE
-- Field workers in remote areas (Quthing, Mokhotlong, etc.)
-- register animals offline. This queue holds pending writes
-- and is processed when connectivity is restored.
-- =============================================================
CREATE TABLE public.offline_sync_queue (
  id                   UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id            TEXT NOT NULL,
  user_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name           TEXT NOT NULL,
  -- 'INSERT', 'UPDATE', 'DELETE'
  operation            TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id            UUID,
  payload              JSONB NOT NULL,
  status               public.sync_status NOT NULL DEFAULT 'pending',
  -- Populated when a conflict is detected on sync
  conflict_data        JSONB,
  conflict_resolution  TEXT,
  synced_at            TIMESTAMPTZ,
  error_message        TEXT,
  retry_count          INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_queue_user   ON public.offline_sync_queue (user_id);
CREATE INDEX idx_sync_queue_status ON public.offline_sync_queue (status);
CREATE INDEX idx_sync_queue_device ON public.offline_sync_queue (device_id);

CREATE TRIGGER trg_offline_sync_queue_updated_at
  BEFORE UPDATE ON public.offline_sync_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE public.liamis_sync_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_mis_sync_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.efi_export_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sync_queue    ENABLE ROW LEVEL SECURITY;

-- Integration logs: admins and district officers can view and manage
CREATE POLICY "Officers can view LIAMIS sync log"
  ON public.liamis_sync_log FOR SELECT
  TO authenticated
  USING (public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager'));

CREATE POLICY "Admins can manage LIAMIS sync log"
  ON public.liamis_sync_log FOR ALL
  TO authenticated
  USING (public.get_user_role() IN ('system_admin', 'district_officer'))
  WITH CHECK (public.get_user_role() IN ('system_admin', 'district_officer'));

CREATE POLICY "Officers can view MIS sync log"
  ON public.project_mis_sync_log FOR SELECT
  TO authenticated
  USING (public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager'));

CREATE POLICY "Admins can manage MIS sync log"
  ON public.project_mis_sync_log FOR ALL
  TO authenticated
  USING (public.get_user_role() IN ('system_admin', 'district_officer'))
  WITH CHECK (public.get_user_role() IN ('system_admin', 'district_officer'));

-- EFI exports
CREATE POLICY "All staff can view EFI exports"
  ON public.efi_export_records FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Officers can manage EFI exports"
  ON public.efi_export_records FOR ALL
  TO authenticated
  USING (public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager'))
  WITH CHECK (public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager'));

-- Offline sync queue: users manage their own device queue
CREATE POLICY "Users can view their own sync queue"
  ON public.offline_sync_queue FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.get_user_role() IN ('system_admin', 'district_officer'));

CREATE POLICY "Users can insert into their own sync queue"
  ON public.offline_sync_queue FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sync queue entries"
  ON public.offline_sync_queue FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.get_user_role() IN ('system_admin', 'district_officer'))
  WITH CHECK (user_id = auth.uid() OR public.get_user_role() IN ('system_admin', 'district_officer'));
