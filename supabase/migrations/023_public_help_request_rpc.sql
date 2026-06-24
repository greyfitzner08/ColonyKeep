-- Allow public community form submissions via SECURITY DEFINER RPC
-- (works with anon key when service role is unavailable on the server).

CREATE OR REPLACE FUNCTION public.create_community_help_request(payload jsonb)
RETURNS TABLE (id uuid, case_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec help_requests%ROWTYPE;
  new_id uuid;
  new_case_number text;
BEGIN
  IF payload ? 'case_number'
    AND (payload->>'case_number' IS NULL OR btrim(payload->>'case_number') = '') THEN
    payload := payload - 'case_number';
  END IF;

  rec := jsonb_populate_record(NULL::help_requests, payload);

  INSERT INTO help_requests (
    status,
    contact_name,
    contact_email,
    contact_phone,
    colony_address,
    colony_city,
    colony_county,
    colony_zip,
    colony_state,
    colony_lat,
    colony_lng,
    contact_first_name,
    contact_last_name,
    contact_street,
    contact_city,
    contact_state,
    contact_zip,
    contact_county,
    kittens_under_8_weeks,
    cats_over_8_weeks,
    pregnant_count,
    feeding_cats,
    feeder_if_not,
    trapping_experience,
    need_traps,
    willing_to_trap_transport,
    able_to_trap_transport,
    has_recovery_space,
    can_help,
    has_traps,
    can_transport,
    consent_communications,
    relationship_to_cats,
    how_heard,
    apartment_name,
    assigned_team_id,
    assigned_team_name,
    intake_notes,
    medical_flags,
    history_log
  )
  VALUES (
    COALESCE(rec.status, 'new_intake'),
    rec.contact_name,
    rec.contact_email,
    rec.contact_phone,
    rec.colony_address,
    rec.colony_city,
    rec.colony_county,
    rec.colony_zip,
    rec.colony_state,
    rec.colony_lat,
    rec.colony_lng,
    rec.contact_first_name,
    rec.contact_last_name,
    rec.contact_street,
    rec.contact_city,
    rec.contact_state,
    rec.contact_zip,
    rec.contact_county,
    COALESCE(rec.kittens_under_8_weeks, 0),
    COALESCE(rec.cats_over_8_weeks, 0),
    COALESCE(rec.pregnant_count, 0),
    rec.feeding_cats,
    rec.feeder_if_not,
    rec.trapping_experience,
    rec.need_traps,
    rec.willing_to_trap_transport,
    rec.able_to_trap_transport,
    COALESCE(rec.has_recovery_space, false),
    COALESCE(rec.can_help, false),
    COALESCE(rec.has_traps, false),
    COALESCE(rec.can_transport, false),
    COALESCE(rec.consent_communications, false),
    rec.relationship_to_cats,
    rec.how_heard,
    rec.apartment_name,
    rec.assigned_team_id,
    rec.assigned_team_name,
    rec.intake_notes,
    COALESCE(rec.medical_flags, '[]'::jsonb),
    COALESCE(rec.history_log, '[]'::jsonb)
  )
  RETURNING help_requests.id, help_requests.case_number INTO new_id, new_case_number;

  RETURN QUERY SELECT new_id, new_case_number;
END;
$$;

REVOKE ALL ON FUNCTION public.create_community_help_request(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_community_help_request(jsonb) TO anon, authenticated, service_role;
