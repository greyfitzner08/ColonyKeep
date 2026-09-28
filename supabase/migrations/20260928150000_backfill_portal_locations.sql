-- Carry foster placement into the portal-only Location section.
-- Re-running leaves a location name that is already filled.

UPDATE adoption_entrance_applications
SET answers = answers || jsonb_strip_nulls(
  jsonb_build_object(
    'location_name', NULLIF(btrim(answers->>'foster_name'), ''),
    'location_type', 'foster',
    'location_contact_name', NULLIF(btrim(answers->>'foster_name'), ''),
    'location_phone', NULLIF(btrim(answers->>'foster_phone'), ''),
    'location_email', NULLIF(btrim(answers->>'foster_email'), ''),
    'location_address', NULLIF(btrim(answers->>'foster_address'), ''),
    'location_active', 'yes'
  )
)
WHERE COALESCE(btrim(answers->>'location_name'), '') = ''
  AND COALESCE(btrim(answers->>'foster_name'), '') <> '';
