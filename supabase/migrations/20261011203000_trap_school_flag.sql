-- Trap School becomes a case flag; geographic teams own assignment by ZIP.

ALTER TABLE public.help_requests
  ADD COLUMN IF NOT EXISTS trap_school_eligible boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.help_requests.trap_school_eligible IS
  'True when reported cats + kittens is 5 or fewer (Trap School candidate). Team assignment still follows colony ZIP.';

-- Flag all small colonies (any status).
UPDATE public.help_requests
SET trap_school_eligible =
  COALESCE(cats_over_8_weeks, 0) + COALESCE(kittens_under_8_weeks, 0) <= 5;

-- Move cases currently on Trap School onto their ZIP-matched geographic team.
UPDATE public.help_requests hr
SET
  assigned_team_id = matched.team_id,
  assigned_team_name = matched.team_name,
  assigned_team = matched.team_name
FROM (
  SELECT DISTINCT ON (hr2.id)
    hr2.id AS help_request_id,
    t.id AS team_id,
    t.name AS team_name
  FROM public.help_requests hr2
  JOIN public.trap_teams ts
    ON lower(btrim(ts.name)) = 'trap school'
  JOIN public.trap_teams t
    ON t.is_active = true
   AND lower(btrim(t.name)) <> 'trap school'
   AND left(regexp_replace(COALESCE(hr2.colony_zip, ''), '\D', '', 'g'), 5)
       = ANY (
         SELECT left(regexp_replace(z, '\D', '', 'g'), 5)
         FROM unnest(t.zip_codes) AS z
         WHERE NULLIF(btrim(z), '') IS NOT NULL
       )
  WHERE hr2.assigned_team_id = ts.id
     OR lower(btrim(COALESCE(hr2.assigned_team_name, ''))) = 'trap school'
  ORDER BY hr2.id, t.name
) AS matched
WHERE hr.id = matched.help_request_id;

-- Cases still on Trap School with no ZIP match become unassigned (flag kept).
UPDATE public.help_requests hr
SET
  assigned_team_id = NULL,
  assigned_team_name = NULL,
  assigned_team = NULL
FROM public.trap_teams ts
WHERE lower(btrim(ts.name)) = 'trap school'
  AND (
    hr.assigned_team_id = ts.id
    OR lower(btrim(COALESCE(hr.assigned_team_name, ''))) = 'trap school'
  );
