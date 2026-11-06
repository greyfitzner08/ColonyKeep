CREATE OR REPLACE FUNCTION public.try_timestamptz(value text)
RETURNS timestamptz
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF value IS NULL OR btrim(value) = '' THEN
    RETURN NULL;
  END IF;
  RETURN value::timestamptz;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_email text,
  actor_name text,
  method text,
  path text,
  summary text NOT NULL,
  source text NOT NULL DEFAULT 'api',
  entity_type text,
  entity_id text
);

CREATE INDEX IF NOT EXISTS audit_events_occurred_at_idx
  ON public.audit_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_actor_email_idx
  ON public.audit_events (lower(actor_email));

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read audit events" ON public.audit_events;
CREATE POLICY "Admins read audit events" ON public.audit_events
  FOR SELECT
  USING (is_admin());

COMMENT ON TABLE public.audit_events IS
  'Admin-only trail of user actions. API writes are recorded going forward; case history is backfilled once.';

INSERT INTO public.audit_events (
  occurred_at,
  actor_email,
  actor_name,
  path,
  summary,
  source,
  entity_type,
  entity_id
)
SELECT
  COALESCE(public.try_timestamptz(entry->>'timestamp'), hr.updated_at, hr.created_at, now()),
  NULLIF(btrim(entry->>'actor_email'), ''),
  NULLIF(btrim(entry->>'actor_name'), ''),
  '/case/' || hr.id::text,
  left(
    btrim(
      concat_ws(
        ' — ',
        NULLIF(btrim(hr.case_number), ''),
        NULLIF(btrim(COALESCE(entry->>'action', 'note')), ''),
        NULLIF(btrim(COALESCE(entry->>'details', '')), '')
      )
    ),
    500
  ),
  'case_history',
  'case',
  hr.id::text
FROM public.help_requests hr
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(COALESCE(hr.history_log, '[]'::jsonb)) = 'array'
      THEN COALESCE(hr.history_log, '[]'::jsonb)
    ELSE '[]'::jsonb
  END
) AS entry
WHERE COALESCE(NULLIF(btrim(entry->>'action'), ''), NULLIF(btrim(entry->>'details'), '')) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.audit_events existing WHERE existing.source = 'case_history'
  );
