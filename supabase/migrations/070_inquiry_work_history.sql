-- Inquiry work history: cases a volunteer previously touched via history_log.
-- Used after handoff to trap (claims are cleared on route, so claimed_by_email alone is insufficient).

CREATE OR REPLACE FUNCTION public.inquiry_work_history(p_email text, p_limit integer DEFAULT 100)
RETURNS SETOF public.help_requests
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT hr.*
  FROM public.help_requests hr
  WHERE NULLIF(btrim(p_email), '') IS NOT NULL
    AND hr.status NOT IN ('new_intake', 'under_review', 'needs_more_info')
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(hr.history_log, '[]'::jsonb)) AS entry
      WHERE lower(COALESCE(entry->>'actor_email', '')) = lower(btrim(p_email))
    )
  ORDER BY hr.updated_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
$$;

GRANT EXECUTE ON FUNCTION public.inquiry_work_history(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.inquiry_work_history(text, integer) TO service_role;
