-- Waitlist for full shifts: interested volunteers when signed_up_emails is at capacity.
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS waitlist_emails TEXT[] DEFAULT '{}';

COMMENT ON COLUMN shifts.waitlist_emails IS
  'Emails of volunteers waitlisted when the shift is full. Order is join order; first is promoted when a spot opens.';
