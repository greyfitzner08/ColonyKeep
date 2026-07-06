-- Track CSV imports so volunteers must personally accept waivers on first login.

ALTER TABLE volunteer_applications
ADD COLUMN IF NOT EXISTS imported_via_csv BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE volunteer_applications
ADD COLUMN IF NOT EXISTS user_requirements_completed_at TIMESTAMPTZ;
