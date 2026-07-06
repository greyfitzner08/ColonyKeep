-- Allow volunteer applications without a birthday (e.g. CSV import).
-- Volunteers are prompted to add their birthday on first login.

ALTER TABLE volunteer_applications
ALTER COLUMN birthday DROP NOT NULL;
