-- Admins choose which attendance responses an event offers.
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS rsvp_buttons text NOT NULL DEFAULT 'both';

ALTER TABLE public.shifts
  DROP CONSTRAINT IF EXISTS shifts_rsvp_buttons_check;

ALTER TABLE public.shifts
  ADD CONSTRAINT shifts_rsvp_buttons_check
    CHECK (rsvp_buttons IN ('both', 'attending', 'decline'));

COMMENT ON COLUMN public.shifts.rsvp_buttons IS
  'Attendance shifts: both, attending only, or decline (can''t make it) only.';

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
    OR NEW.rsvp_buttons IS DISTINCT FROM OLD.rsvp_buttons
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.google_calendar_uid IS DISTINCT FROM OLD.google_calendar_uid
  THEN
    RAISE EXCEPTION 'Only signup, waitlist, and declined fields may be updated on shifts'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
