-- =============================================================
-- HerdSync V2 — Lesotho National Breeding System
-- Migration 9: Notifications and audit log
-- =============================================================

-- =============================================================
-- NOTIFICATIONS
-- In-app alerts for individual staff members.
-- =============================================================
CREATE TABLE public.notifications (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  -- 'info', 'warning', 'error', 'success'
  type       TEXT NOT NULL DEFAULT 'info',
  read       BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications (user_id);
CREATE INDEX idx_notifications_read ON public.notifications (user_id, read);

-- =============================================================
-- AUDIT LOG
-- Immutable record of all data changes made by staff.
-- Used for compliance, TOGAF security alignment, and
-- government accountability requirements.
-- =============================================================
CREATE TABLE public.audit_log (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,   -- 'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT'
  table_name TEXT NOT NULL,
  record_id  UUID,
  old_data   JSONB,
  new_data   JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user      ON public.audit_log (user_id);
CREATE INDEX idx_audit_table     ON public.audit_log (table_name);
CREATE INDEX idx_audit_record    ON public.audit_log (record_id);
CREATE INDEX idx_audit_created   ON public.audit_log (created_at);

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log     ENABLE ROW LEVEL SECURITY;

-- Notifications: users see only their own
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark their notifications as read"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager')
    OR user_id = auth.uid()
  );

-- Audit log: admins read; system writes (via security definer functions)
CREATE POLICY "Admins can view audit log"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.get_user_role() IN ('system_admin', 'district_officer'));

CREATE POLICY "System can insert audit entries"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
