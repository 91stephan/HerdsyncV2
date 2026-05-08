ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.employee_tasks REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_tasks;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;