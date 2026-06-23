-- Align live volunteer_applications with the app schema.
-- Safe to run multiple times.

ALTER TABLE volunteer_applications
  ADD COLUMN IF NOT EXISTS why_volunteer TEXT,
  ADD COLUMN IF NOT EXISTS availability TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS shadow_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS intake_training BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS event_crash_course BOOLEAN DEFAULT FALSE;
