-- Public Google Calendar embed URL for Shift Board display.

ALTER TABLE platform_branding
  ADD COLUMN IF NOT EXISTS google_calendar_embed_url TEXT;
