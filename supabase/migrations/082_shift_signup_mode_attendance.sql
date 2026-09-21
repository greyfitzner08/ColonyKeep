-- Coverage slots (volunteers_needed + waitlist) vs open attendance RSVPs.
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS signup_mode text NOT NULL DEFAULT 'coverage';

ALTER TABLE public.shifts
  DROP CONSTRAINT IF EXISTS shifts_signup_mode_check;

ALTER TABLE public.shifts
  ADD CONSTRAINT shifts_signup_mode_check
  CHECK (signup_mode IN ('coverage', 'attendance'));

COMMENT ON COLUMN public.shifts.signup_mode IS
  'coverage = fill N spots with waitlist; attendance = open RSVP (attending / not attending).';

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS declined_emails text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.shifts.declined_emails IS
  'Attendance-mode RSVP no. Unused for coverage shifts.';

-- Defense in depth: non-admins may only change signup lists, not shift metadata.
CREATE OR REPLACE FUNCTION public.enforce_shift_signup_only_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.event_name IS DISTINCT FROM OLD.event_name
    OR NEW.position_name IS DISTINCT FROM OLD.position_name
    OR NEW.shift_type IS DISTINCT FROM OLD.shift_type
    OR NEW.required_roles IS DISTINCT FROM OLD.required_roles
    OR NEW.date IS DISTINCT FROM OLD.date
    OR NEW.start_time IS DISTINCT FROM OLD.start_time
    OR NEW.end_time IS DISTINCT FROM OLD.end_time
    OR NEW.location IS DISTINCT FROM OLD.location
    OR NEW.team_ids IS DISTINCT FROM OLD.team_ids
    OR NEW.volunteers_needed IS DISTINCT FROM OLD.volunteers_needed
    OR NEW.notes IS DISTINCT FROM OLD.notes
    OR NEW.signup_mode IS DISTINCT FROM OLD.signup_mode
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Only signup, waitlist, and declined fields may be updated on shifts'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
