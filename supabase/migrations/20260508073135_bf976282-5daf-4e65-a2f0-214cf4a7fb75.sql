-- Attach auto-admin trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_role();

-- Lock down expense-receipts bucket (private + owner-scoped policies)
UPDATE storage.buckets SET public = false WHERE id = 'expense-receipts';

DROP POLICY IF EXISTS "Users can view their own expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own expense receipts" ON storage.objects;

CREATE POLICY "Users can view their own expense receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own expense receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own expense receipts"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own expense receipts"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);