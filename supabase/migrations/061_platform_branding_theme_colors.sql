-- Theme colors for organization branding.

ALTER TABLE platform_branding
  ADD COLUMN IF NOT EXISTS primary_color TEXT,
  ADD COLUMN IF NOT EXISTS sidebar_color TEXT;
