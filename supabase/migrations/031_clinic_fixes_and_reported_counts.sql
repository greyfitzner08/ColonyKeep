-- Preserve originally reported colony counts and track each clinic fix separately.

ALTER TABLE help_requests
  ADD COLUMN IF NOT EXISTS reported_cats_over_8_weeks INTEGER,
  ADD COLUMN IF NOT EXISTS reported_kittens_under_8_weeks INTEGER;

CREATE TABLE IF NOT EXISTS clinic_fixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  help_request_id UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  age_category TEXT NOT NULL CHECK (age_category IN ('adult', 'kitten')),
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  clinic_name TEXT,
  fix_date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_by TEXT,
  logged_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_fixes_help_request ON clinic_fixes(help_request_id);
CREATE INDEX IF NOT EXISTS idx_clinic_fixes_appointment ON clinic_fixes(appointment_id);

-- Backfill fix rows from appointments that already logged clinic results.
INSERT INTO clinic_fixes (
  help_request_id,
  appointment_id,
  age_category,
  gender,
  clinic_name,
  fix_date,
  logged_by,
  logged_by_name,
  created_at
)
SELECT
  a.help_request_id,
  a.id,
  a.clinic_result_age_category,
  a.clinic_result_gender,
  a.clinic_name,
  a.date::date,
  a.clinic_result_logged_by,
  a.clinic_result_logged_by_name,
  a.clinic_result_logged_at
FROM appointments a
WHERE a.clinic_result_logged_at IS NOT NULL
  AND a.help_request_id IS NOT NULL
  AND a.clinic_result_age_category IS NOT NULL
  AND a.clinic_result_gender IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM clinic_fixes cf WHERE cf.appointment_id = a.id
  );

-- Reported = remaining + fixes already recorded (restores original intake totals).
UPDATE help_requests hr
SET
  reported_cats_over_8_weeks = hr.cats_over_8_weeks + COALESCE((
    SELECT COUNT(*)::int
    FROM clinic_fixes cf
    WHERE cf.help_request_id = hr.id AND cf.age_category = 'adult'
  ), 0),
  reported_kittens_under_8_weeks = hr.kittens_under_8_weeks + COALESCE((
    SELECT COUNT(*)::int
    FROM clinic_fixes cf
    WHERE cf.help_request_id = hr.id AND cf.age_category = 'kitten'
  ), 0)
WHERE reported_cats_over_8_weeks IS NULL OR reported_kittens_under_8_weeks IS NULL;

ALTER TABLE clinic_fixes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read clinic fixes" ON clinic_fixes;
CREATE POLICY "Staff read clinic fixes" ON clinic_fixes FOR SELECT USING (
  is_case_worker() OR can_manage_appointments()
);

DROP POLICY IF EXISTS "Staff insert clinic fixes" ON clinic_fixes;
CREATE POLICY "Staff insert clinic fixes" ON clinic_fixes FOR INSERT WITH CHECK (
  is_case_worker() OR can_manage_appointments()
);
