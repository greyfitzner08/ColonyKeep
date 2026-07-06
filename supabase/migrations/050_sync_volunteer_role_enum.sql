-- Ensure volunteer_role enum includes roles referenced by the app.

ALTER TYPE volunteer_role ADD VALUE IF NOT EXISTS 'clinic_coordination';
ALTER TYPE volunteer_role ADD VALUE IF NOT EXISTS 'youth_volunteer';
