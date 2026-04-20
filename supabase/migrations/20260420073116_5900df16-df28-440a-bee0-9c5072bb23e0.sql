-- Sync subscription statuses to reflect reality (today: 2026-04-20)
-- Mark trials whose trial_ends_at has passed as expired
UPDATE public.subscriptions
SET status = 'expired',
    updated_at = now()
WHERE status = 'trialing'
  AND trial_ends_at < now();

-- Mark active subscriptions whose current_period_end has passed as expired,
-- BUT skip admin-owned subscriptions (they auto-renew on login)
UPDATE public.subscriptions
SET status = 'expired',
    updated_at = now()
WHERE status = 'active'
  AND current_period_end IS NOT NULL
  AND current_period_end < now()
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = subscriptions.user_id
      AND ur.role = 'admin'
  );

-- Auto-renew admin subscriptions immediately so test accounts retain access
UPDATE public.subscriptions
SET status = 'active',
    current_period_start = now(),
    current_period_end = now() + INTERVAL '1 month',
    updated_at = now()
WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = subscriptions.user_id
      AND ur.role = 'admin'
  )
  AND (
    status = 'expired'
    OR (current_period_end IS NOT NULL AND current_period_end < now())
    OR (status = 'trialing' AND trial_ends_at < now())
  );