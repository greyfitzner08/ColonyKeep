-- Allow clinic fix age/gender to be omitted when logging a fix.
ALTER TABLE clinic_fixes
  ALTER COLUMN age_category DROP NOT NULL;

ALTER TABLE clinic_fixes
  ALTER COLUMN gender DROP NOT NULL;

ALTER TABLE clinic_fixes
  DROP CONSTRAINT IF EXISTS clinic_fixes_age_category_check;

ALTER TABLE clinic_fixes
  ADD CONSTRAINT clinic_fixes_age_category_check
  CHECK (age_category IS NULL OR age_category IN ('adult', 'kitten'));

ALTER TABLE clinic_fixes
  DROP CONSTRAINT IF EXISTS clinic_fixes_gender_check;

ALTER TABLE clinic_fixes
  ADD CONSTRAINT clinic_fixes_gender_check
  CHECK (gender IS NULL OR gender IN ('male', 'female'));
