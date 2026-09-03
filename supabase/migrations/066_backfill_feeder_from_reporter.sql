-- When the reporter feeds the colony, copy their contact + colony location into feeder fields.
UPDATE help_requests
SET
  feeder_name = COALESCE(
    NULLIF(btrim(feeder_name), ''),
    NULLIF(btrim(contact_name), ''),
    NULLIF(btrim(concat_ws(' ', contact_first_name, contact_last_name)), '')
  ),
  feeder_phone = COALESCE(NULLIF(btrim(feeder_phone), ''), contact_phone),
  feeder_email = COALESCE(NULLIF(btrim(feeder_email), ''), contact_email),
  feeder_street = COALESCE(NULLIF(btrim(feeder_street), ''), colony_address),
  feeder_city = COALESCE(NULLIF(btrim(feeder_city), ''), colony_city),
  feeder_state = COALESCE(NULLIF(btrim(feeder_state), ''), colony_state),
  feeder_zip = COALESCE(NULLIF(btrim(feeder_zip), ''), colony_zip),
  feeder_county = COALESCE(NULLIF(btrim(feeder_county), ''), colony_county),
  feeder_lat = COALESCE(feeder_lat, colony_lat),
  feeder_lng = COALESCE(feeder_lng, colony_lng)
WHERE feeding_cats IS TRUE
  AND (
    feeder_name IS NULL
    OR btrim(feeder_name) = ''
    OR feeder_phone IS NULL
    OR feeder_email IS NULL
    OR feeder_street IS NULL
  );
