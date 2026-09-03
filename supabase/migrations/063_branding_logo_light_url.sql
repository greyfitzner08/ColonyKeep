-- Separate logos for light vs dark surfaces (login vs sidebar).

ALTER TABLE platform_branding
  ADD COLUMN IF NOT EXISTS logo_light_url TEXT;

COMMENT ON COLUMN platform_branding.logo_url IS
  'Logo optimized for dark backgrounds (sidebar / dark chrome)';
COMMENT ON COLUMN platform_branding.logo_light_url IS
  'Logo optimized for light backgrounds (login and public pages)';
