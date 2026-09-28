-- Existing roster cats were entered before the rescue application.
-- Give each one an approved application so the record matches that form.

INSERT INTO adoption_entrance_applications (
  status,
  cat_name,
  answers,
  reviewed_at,
  adoptable_cat_id,
  created_at
)
SELECT
  'approved',
  c.name,
  jsonb_strip_nulls(
    jsonb_build_object(
      'cat_name', c.name,
      'gender', c.sex,
      'estimated_age', NULLIF(btrim(c.age_description), ''),
      'personality', NULLIF(btrim(c.personality_notes), ''),
      'notes', NULLIF(btrim(c.notes), ''),
      'current_status', CASE c.status
        WHEN 'available' THEN 'Available'
        WHEN 'pending' THEN 'Pending adoption'
        WHEN 'hold' THEN 'On hold'
        WHEN 'adopted' THEN 'Adopted'
        WHEN 'unavailable' THEN 'Unavailable'
        ELSE c.status
      END,
      'adopted', CASE WHEN c.status = 'adopted' THEN 'yes' ELSE 'no' END,
      'date_referred', to_char(c.created_at AT TIME ZONE 'America/New_York', 'YYYY-MM-DD'),
      'vaccinations', NULLIF(btrim(c.vaccination_notes), ''),
      'tests_treatments', NULLIF(
        concat_ws(
          E'\n',
          CASE
            WHEN c.spayed_neutered IS TRUE THEN 'Spayed or neutered'
            WHEN c.spayed_neutered IS FALSE THEN 'Not spayed or neutered'
          END,
          CASE
            WHEN c.vaccinated IS TRUE AND NULLIF(btrim(c.vaccination_notes), '') IS NULL THEN 'Vaccinated'
            WHEN c.vaccinated IS FALSE THEN 'Not vaccinated'
          END,
          CASE WHEN c.fiv_status <> 'unknown' THEN 'FIV: ' || c.fiv_status END,
          CASE WHEN c.felv_status <> 'unknown' THEN 'FeLV: ' || c.felv_status END,
          CASE WHEN c.fip_status <> 'unknown' THEN 'FIP: ' || c.fip_status END,
          NULLIF(btrim(c.medical_notes), '')
        ),
        ''
      ),
      'foster_name', CASE
        WHEN l.location_type = 'foster' THEN COALESCE(NULLIF(btrim(l.contact_name), ''), l.name)
      END,
      'foster_phone', CASE
        WHEN l.location_type = 'foster' THEN NULLIF(btrim(l.contact_phone), '')
      END,
      'foster_email', CASE
        WHEN l.location_type = 'foster' THEN NULLIF(btrim(l.contact_email), '')
      END,
      'foster_address', CASE
        WHEN l.location_type = 'foster' THEN NULLIF(
          concat_ws(
            ', ',
            NULLIF(btrim(l.address), ''),
            NULLIF(concat_ws(' ', NULLIF(btrim(l.city), ''), NULLIF(btrim(l.state), '')), ''),
            NULLIF(btrim(l.zip), '')
          ),
          ''
        )
      END,
      'location_before_entry', CASE
        WHEN l.location_type = 'petstore' THEN l.name
      END
    )
  ),
  c.created_at,
  c.id,
  c.created_at
FROM adoptable_cats c
LEFT JOIN adoption_locations l ON l.id = c.location_id
WHERE NOT EXISTS (
  SELECT 1
  FROM adoption_entrance_applications existing
  WHERE existing.adoptable_cat_id = c.id
);
