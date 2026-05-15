-- =============================================================
-- HerdSync V2 — Lesotho National Breeding System
-- Migration 7: Compliance documents and tasks
-- =============================================================

-- =============================================================
-- COMPLIANCE DOCUMENTS  (Lesotho / Ministry document vault)
-- =============================================================
CREATE TABLE public.compliance_documents (
  id                  UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  district_id         UUID REFERENCES public.districts(id),
  breeding_center_id  UUID REFERENCES public.breeding_centers(id),
  title               TEXT NOT NULL,
  category            public.document_category NOT NULL,
  file_url            TEXT NOT NULL,
  file_name           TEXT NOT NULL,
  uploaded_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  date_of_document    DATE,
  expiry_date         DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_docs_district  ON public.compliance_documents (district_id);
CREATE INDEX idx_docs_center    ON public.compliance_documents (breeding_center_id);
CREATE INDEX idx_docs_category  ON public.compliance_documents (category);
CREATE INDEX idx_docs_expiry    ON public.compliance_documents (expiry_date);

CREATE TRIGGER trg_compliance_documents_updated_at
  BEFORE UPDATE ON public.compliance_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- TASKS
-- Used for field assignments, scheduled activities, and
-- follow-up actions by Ministry staff.
-- =============================================================
CREATE TABLE public.tasks (
  id                  UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title               TEXT NOT NULL,
  description         TEXT,
  assigned_to         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  district_id         UUID REFERENCES public.districts(id),
  breeding_center_id  UUID REFERENCES public.breeding_centers(id),
  priority            public.task_priority NOT NULL DEFAULT 'medium',
  status              public.task_status NOT NULL DEFAULT 'pending',
  due_date            DATE,
  completed_at        TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_assigned_to ON public.tasks (assigned_to);
CREATE INDEX idx_tasks_district     ON public.tasks (district_id);
CREATE INDEX idx_tasks_status       ON public.tasks (status);
CREATE INDEX idx_tasks_due          ON public.tasks (due_date);

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE public.compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                ENABLE ROW LEVEL SECURITY;

-- Documents
CREATE POLICY "Staff can view documents"
  ON public.compliance_documents FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Staff can upload documents"
  ON public.compliance_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager', 'veterinarian', 'field_worker')
  );

CREATE POLICY "Uploaders and officers can update documents"
  ON public.compliance_documents FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager')
    OR uploaded_by = auth.uid()
  )
  WITH CHECK (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager')
    OR uploaded_by = auth.uid()
  );

CREATE POLICY "Admins can delete documents"
  ON public.compliance_documents FOR DELETE
  TO authenticated
  USING (public.get_user_role() IN ('system_admin', 'center_manager'));

-- Tasks
CREATE POLICY "Staff can view their own and assigned tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager')
    OR assigned_to = auth.uid()
    OR assigned_by = auth.uid()
    OR district_id = public.get_user_district_id()
  );

CREATE POLICY "Officers and above can create tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager')
  );

CREATE POLICY "Assignees and officers can update tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager')
    OR assigned_to = auth.uid()
  )
  WITH CHECK (
    public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager')
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Admins can delete tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (public.get_user_role() IN ('system_admin', 'district_officer', 'center_manager'));

-- Storage bucket for compliance documents
INSERT INTO storage.buckets (id, name, public)
  VALUES ('compliance-documents', 'compliance-documents', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated staff can upload documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'compliance-documents');

CREATE POLICY "Authenticated staff can read documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'compliance-documents');

CREATE POLICY "Uploaders can delete their documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'compliance-documents');
