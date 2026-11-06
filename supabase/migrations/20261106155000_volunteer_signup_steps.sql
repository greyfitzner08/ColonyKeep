ALTER TABLE platform_branding
  ADD COLUMN IF NOT EXISTS volunteer_signup_steps JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN platform_branding.volunteer_signup_steps IS
  'Ordered volunteer-application content steps. Each step can be limited to selected volunteer opportunities.';
