-- Track when a user has finished (or skipped) the platform walkthrough

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS platform_tutorial_completed_at TIMESTAMPTZ;
