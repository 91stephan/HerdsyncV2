-- Revoke EXECUTE from anon on internal SECURITY DEFINER helpers.
-- Keep EXECUTE for authenticated users.
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'get_employee_permissions(uuid,uuid)',
    'get_invited_user_limit(subscription_tier)',
    'is_employee_user(uuid)',
    'can_view_employees(uuid,uuid)',
    'create_farm_for_user(text,text,text)',
    'mark_invitation_accessed(uuid)',
    'check_login_rate_limit(text)',
    'log_login_attempt(text,text,boolean)',
    'log_invitation_rate_limit(text,text,boolean)',
    'count_invited_users(uuid)',
    'is_invited_user(uuid)',
    'can_access_farm(uuid,uuid)',
    'is_employee_of_farm(uuid,uuid)',
    'is_farm_member(uuid,uuid)',
    'get_admin_tier(uuid)',
    'has_role(uuid,app_role)',
    'has_active_subscription(uuid,uuid)',
    'is_farm_owner(uuid,uuid)',
    'get_subscription_status(uuid)',
    'auto_renew_admin_subscription(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon, public', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', fn);
  END LOOP;
END $$;