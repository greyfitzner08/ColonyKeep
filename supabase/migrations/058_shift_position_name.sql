-- Named volunteer position within an event (e.g. Registration Desk, Parking).
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS position_name TEXT;

COMMENT ON COLUMN shifts.position_name IS
  'Volunteer position title within the event. Multiple dated shifts can share the same position_name.';
