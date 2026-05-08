CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  severity text NOT NULL DEFAULT 'error',
  source text NOT NULL DEFAULT 'client',
  message text NOT NULL,
  stack text,
  url text,
  user_agent text,
  user_id uuid,
  farm_id uuid,
  context jsonb
);

CREATE INDEX idx_error_logs_created_at ON public.error_logs (created_at DESC);
CREATE INDEX idx_error_logs_user_id ON public.error_logs (user_id);
CREATE INDEX idx_error_logs_farm_id ON public.error_logs (farm_id);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Anyone (auth or anon) may insert; we still capture pre-auth crashes
CREATE POLICY "Anyone can insert error logs"
ON public.error_logs FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins can view error logs"
ON public.error_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete (for cleanup)
CREATE POLICY "Admins can delete error logs"
ON public.error_logs FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));