-- Track clinic outcomes for reserved appointments (TNVR result logging).

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS clinic_result_logged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clinic_result_age_category TEXT
    CHECK (clinic_result_age_category IS NULL OR clinic_result_age_category IN ('adult', 'kitten')),
  ADD COLUMN IF NOT EXISTS clinic_result_gender TEXT
    CHECK (clinic_result_gender IS NULL OR clinic_result_gender IN ('male', 'female')),
  ADD COLUMN IF NOT EXISTS clinic_result_logged_by TEXT,
  ADD COLUMN IF NOT EXISTS clinic_result_logged_by_name TEXT;

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_result_pending
  ON appointments (date, reserved_by)
  WHERE clinic_result_logged_at IS NULL
    AND status IN ('reserved', 'confirmed_transport');
