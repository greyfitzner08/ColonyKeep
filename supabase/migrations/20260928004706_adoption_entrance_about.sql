-- Editable About Us splash for the public adoption program entrance form.

ALTER TABLE platform_branding
  ADD COLUMN IF NOT EXISTS adoption_entrance_about_message TEXT;
