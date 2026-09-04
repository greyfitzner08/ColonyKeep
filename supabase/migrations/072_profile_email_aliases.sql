-- Alternate emails kept when merging duplicate accounts.
-- Primary login stays on profiles.email; aliases preserve history and contactability.

CREATE TABLE IF NOT EXISTS public.profile_email_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_email_aliases_email_key UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS profile_email_aliases_profile_id_idx
  ON public.profile_email_aliases (profile_id);

ALTER TABLE public.profile_email_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage email aliases" ON public.profile_email_aliases;
CREATE POLICY "Admins manage email aliases" ON public.profile_email_aliases
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users read own email aliases" ON public.profile_email_aliases;
CREATE POLICY "Users read own email aliases" ON public.profile_email_aliases
  FOR SELECT USING (profile_id = auth.uid());

-- Normalize alias emails to lowercase.
CREATE OR REPLACE FUNCTION public.normalize_profile_email_alias()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.email := lower(btrim(NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profile_email_aliases_normalize ON public.profile_email_aliases;
CREATE TRIGGER profile_email_aliases_normalize
  BEFORE INSERT OR UPDATE OF email ON public.profile_email_aliases
  FOR EACH ROW EXECUTE FUNCTION public.normalize_profile_email_alias();

-- Work history includes primary email and any aliases.
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
  WITH identity AS (
    SELECT lower(btrim(p_email)) AS email
    WHERE NULLIF(btrim(p_email), '') IS NOT NULL
  ),
  owned_emails AS (
    SELECT identity.email
    FROM identity
    UNION
    SELECT lower(p.email)
    FROM public.profiles p
    JOIN identity ON lower(p.email) = identity.email
    UNION
    SELECT lower(a.email)
    FROM public.profile_email_aliases a
    JOIN public.profiles p ON p.id = a.profile_id
    JOIN identity ON lower(p.email) = identity.email OR lower(a.email) = identity.email
  )
  SELECT hr.*
  FROM public.help_requests hr
  WHERE EXISTS (SELECT 1 FROM owned_emails)
    AND (
      NOT p_exclude_intake_queue
      OR hr.status NOT IN ('new_intake', 'under_review', 'needs_more_info')
    )
    AND (
      lower(COALESCE(hr.claimed_by_email, '')) IN (SELECT email FROM owned_emails)
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(hr.history_log, '[]'::jsonb)) AS entry
        WHERE lower(COALESCE(entry->>'actor_email', '')) IN (SELECT email FROM owned_emails)
      )
      OR EXISTS (
        SELECT 1
        FROM public.appointments ap
        WHERE ap.help_request_id = hr.id
          AND lower(COALESCE(ap.reserved_by, '')) IN (SELECT email FROM owned_emails)
      )
      OR EXISTS (
        SELECT 1
        FROM public.clinic_fixes cf
        WHERE cf.help_request_id = hr.id
          AND lower(COALESCE(cf.logged_by, '')) IN (SELECT email FROM owned_emails)
      )
    )
  ORDER BY hr.updated_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
$$;
