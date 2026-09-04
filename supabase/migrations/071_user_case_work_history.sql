-- General case work history for any volunteer (inquiry, trap, clinic, etc.).
-- Matches history_log actors, current claim, reserved appointments, and clinic fix logs.

CREATE OR REPLACE FUNCTION public.user_case_work_history(
  p_email text,
  p_limit integer DEFAULT 100,
  p_exclude_intake_queue boolean DEFAULT false
)
RETURNS SETOF public.help_requests
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT hr.*
  FROM public.help_requests hr
  WHERE NULLIF(btrim(p_email), '') IS NOT NULL
    AND (
      NOT p_exclude_intake_queue
      OR hr.status NOT IN ('new_intake', 'under_review', 'needs_more_info')
    )
    AND (
      lower(COALESCE(hr.claimed_by_email, '')) = lower(btrim(p_email))
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(hr.history_log, '[]'::jsonb)) AS entry
        WHERE lower(COALESCE(entry->>'actor_email', '')) = lower(btrim(p_email))
      )
      OR EXISTS (
        SELECT 1
        FROM public.appointments a
        WHERE a.help_request_id = hr.id
          AND lower(COALESCE(a.reserved_by, '')) = lower(btrim(p_email))
      )
      OR EXISTS (
        SELECT 1
        FROM public.clinic_fixes cf
        WHERE cf.help_request_id = hr.id
          AND lower(COALESCE(cf.logged_by, '')) = lower(btrim(p_email))
      )
    )
  ORDER BY hr.updated_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
$$;

GRANT EXECUTE ON FUNCTION public.user_case_work_history(text, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_case_work_history(text, integer, boolean) TO service_role;

-- Keep the inquiry helper as a thin wrapper for older callers.
CREATE OR REPLACE FUNCTION public.inquiry_work_history(p_email text, p_limit integer DEFAULT 100)
RETURNS SETOF public.help_requests
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM public.user_case_work_history(p_email, p_limit, true);
$$;
