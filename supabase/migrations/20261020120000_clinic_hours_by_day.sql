-- Partner clinic open/close times by weekday (empty object = hours not recorded).
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS hours_by_day JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN clinics.hours_by_day IS
  'Open/close times keyed by weekday name, e.g. {"Monday":{"open":"09:00","close":"17:00"}}.';
