-- Latest known sign-in for each account. Supabase does not keep a full login history.
INSERT INTO public.audit_events (
  occurred_at,
  actor_id,
  actor_email,
  actor_name,
  path,
  summary,
  source
)
SELECT
  u.last_sign_in_at,
  u.id,
  u.email,
  p.full_name,
  '/login',
  'Signed in',
  'login'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.last_sign_in_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.audit_events e
    WHERE e.source = 'login'
      AND e.actor_id = u.id
      AND e.occurred_at = u.last_sign_in_at
  );
