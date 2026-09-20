-- Trap School team for small colonies (≤5 cats + kittens).
-- Retire Inquiry Team platform role: convert accounts to TNVR team.
-- Auto-route any remaining inquiry-queue cases onto trap teams.

INSERT INTO public.trap_teams (name, region, lead_email, zip_codes, members, is_active)
SELECT 'Trap School', '', '', '{}'::text[], '{}'::text[], true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.trap_teams
  WHERE lower(btrim(name)) = 'trap school'
);

UPDATE public.profiles
SET role = 'trap_team_lead'
WHERE role = 'inquiry_team';

-- Small colonies → Trap School
UPDATE public.help_requests hr
SET
  assigned_team_id = ts.id,
  assigned_team_name = ts.name,
  assigned_team = ts.name,
  status = CASE
    WHEN hr.status IN ('new_intake', 'under_review', 'needs_more_info')
      THEN 'routed_to_trap_team'
    ELSE hr.status
  END,
  claimed_by_email = CASE
    WHEN hr.status IN ('new_intake', 'under_review', 'needs_more_info') THEN NULL
    ELSE hr.claimed_by_email
  END,
  claimed_by_name = CASE
    WHEN hr.status IN ('new_intake', 'under_review', 'needs_more_info') THEN NULL
    ELSE hr.claimed_by_name
  END,
  assigned_to = CASE
    WHEN hr.status IN ('new_intake', 'under_review', 'needs_more_info') THEN NULL
    ELSE hr.assigned_to
  END
FROM public.trap_teams ts
WHERE lower(btrim(ts.name)) = 'trap school'
  AND ts.is_active = true
  AND COALESCE(hr.cats_over_8_weeks, 0) + COALESCE(hr.kittens_under_8_weeks, 0) <= 5
  AND (
    hr.assigned_team_id IS NULL
    OR hr.status IN ('new_intake', 'under_review', 'needs_more_info')
    OR lower(btrim(COALESCE(hr.assigned_team_name, ''))) = 'trap school'
  );

-- Larger colonies still in inquiry queue → ZIP-matched team when available
UPDATE public.help_requests hr
SET
  assigned_team_id = matched.team_id,
  assigned_team_name = matched.team_name,
  assigned_team = matched.team_name,
  status = 'routed_to_trap_team',
  claimed_by_email = NULL,
  claimed_by_name = NULL,
  assigned_to = NULL
FROM (
  SELECT DISTINCT ON (hr2.id)
    hr2.id AS help_request_id,
    t.id AS team_id,
    t.name AS team_name
  FROM public.help_requests hr2
  JOIN public.trap_teams t
    ON t.is_active = true
   AND lower(btrim(t.name)) <> 'trap school'
   AND left(regexp_replace(COALESCE(hr2.colony_zip, ''), '\D', '', 'g'), 5)
       = ANY (
         SELECT left(regexp_replace(z, '\D', '', 'g'), 5)
         FROM unnest(t.zip_codes) AS z
         WHERE NULLIF(btrim(z), '') IS NOT NULL
       )
  WHERE hr2.status IN ('new_intake', 'under_review', 'needs_more_info')
    AND COALESCE(hr2.cats_over_8_weeks, 0) + COALESCE(hr2.kittens_under_8_weeks, 0) > 5
  ORDER BY hr2.id, t.name
) AS matched
WHERE hr.id = matched.help_request_id;

-- Remaining inquiry-queue cases without a ZIP match: still leave inquiry by routing unassigned
UPDATE public.help_requests
SET
  status = 'routed_to_trap_team',
  claimed_by_email = NULL,
  claimed_by_name = NULL,
  assigned_to = NULL
WHERE status IN ('new_intake', 'under_review', 'needs_more_info');

-- Keep is_staff / case-worker helpers working without inquiry_team.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_user_role() IN ('admin', 'trap_team_lead', 'clinic_coordination');
$$;

CREATE OR REPLACE FUNCTION public.is_case_worker()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_admin()
    OR get_user_role() = 'trap_team_lead'
    OR (
      get_user_role() = 'volunteer'
      AND (
        'intake_representative' = ANY(profile_volunteer_roles())
        OR profile_volunteer_roles() && ARRAY['trapper', 'trap_loaner', 'transporter', 'recovery']::TEXT[]
      )
    );
$$;
