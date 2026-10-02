-- Attendance buttons can each be hidden, and their wording is editable.
-- Separate Google events stay separate even when the title matches.

ALTER TABLE public.shifts
  DROP CONSTRAINT IF EXISTS shifts_rsvp_buttons_check;

ALTER TABLE public.shifts
  ADD CONSTRAINT shifts_rsvp_buttons_check
    CHECK (rsvp_buttons IN ('both', 'attending', 'decline', 'none'));

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS attending_label text NOT NULL DEFAULT 'I''m attending';

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS decline_label text NOT NULL DEFAULT 'Can''t make it';

ALTER TABLE public.shifts
  DROP CONSTRAINT IF EXISTS shifts_attending_label_check;

ALTER TABLE public.shifts
  ADD CONSTRAINT shifts_attending_label_check
    CHECK (char_length(attending_label) BETWEEN 1 AND 40);

ALTER TABLE public.shifts
  DROP CONSTRAINT IF EXISTS shifts_decline_label_check;

ALTER TABLE public.shifts
  ADD CONSTRAINT shifts_decline_label_check
    CHECK (char_length(decline_label) BETWEEN 1 AND 40);

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS event_group text;

UPDATE public.shifts
SET event_group = split_part(google_calendar_uid, '|', 1)
WHERE google_calendar_uid IS NOT NULL
  AND event_group IS NULL;

COMMENT ON COLUMN public.shifts.rsvp_buttons IS
  'Attendance shifts: both, attending only, decline only, or none.';
COMMENT ON COLUMN public.shifts.attending_label IS
  'Label volunteers see on the attending response button.';
COMMENT ON COLUMN public.shifts.decline_label IS
  'Label volunteers see on the can''t-make-it response button.';
COMMENT ON COLUMN public.shifts.event_group IS
  'Google calendar series id. Separate events stay separate even with the same title.';

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
    OR NEW.attending_label IS DISTINCT FROM OLD.attending_label
    OR NEW.decline_label IS DISTINCT FROM OLD.decline_label
    OR NEW.event_group IS DISTINCT FROM OLD.event_group
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.google_calendar_uid IS DISTINCT FROM OLD.google_calendar_uid
  THEN
    RAISE EXCEPTION 'Only signup, waitlist, and declined fields may be updated on shifts'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
