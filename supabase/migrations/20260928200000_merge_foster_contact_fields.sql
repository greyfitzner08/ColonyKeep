-- Keep one foster name, phone, email, and address when the location tab
-- listed those details twice. Prefer the portal contact when it was filled in.
update public.adoption_entrance_applications
set answers = answers || jsonb_build_object(
  'foster_name', coalesce(
    nullif(btrim(answers->>'location_contact_name'), ''),
    nullif(btrim(answers->>'foster_name'), ''),
    nullif(btrim(answers->>'location_name'), ''),
    ''
  ),
  'foster_phone', coalesce(
    nullif(btrim(answers->>'location_phone'), ''),
    nullif(btrim(answers->>'foster_phone'), ''),
    ''
  ),
  'foster_email', coalesce(
    nullif(btrim(answers->>'location_email'), ''),
    nullif(btrim(answers->>'foster_email'), ''),
    ''
  ),
  'location_address', coalesce(
    nullif(btrim(answers->>'location_address'), ''),
    nullif(btrim(answers->>'foster_address'), ''),
    ''
  )
)
where answers is not null
  and (
    coalesce(nullif(btrim(answers->>'location_contact_name'), ''), '') <> ''
    or coalesce(nullif(btrim(answers->>'location_name'), ''), '') <> ''
    or coalesce(nullif(btrim(answers->>'location_phone'), ''), '') <> ''
    or coalesce(nullif(btrim(answers->>'location_email'), ''), '') <> ''
    or (
      coalesce(nullif(btrim(answers->>'location_address'), ''), '') = ''
      and coalesce(nullif(btrim(answers->>'foster_address'), ''), '') <> ''
    )
  );
