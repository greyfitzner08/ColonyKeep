-- Expand help_requests for legacy case imports and app compatibility.

CREATE SEQUENCE IF NOT EXISTS help_request_case_seq START 1;

ALTER TABLE help_requests
  ADD COLUMN IF NOT EXISTS case_number TEXT,
  ADD COLUMN IF NOT EXISTS contact_first_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_last_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_street TEXT,
  ADD COLUMN IF NOT EXISTS contact_city TEXT,
  ADD COLUMN IF NOT EXISTS contact_state TEXT,
  ADD COLUMN IF NOT EXISTS contact_zip TEXT,
  ADD COLUMN IF NOT EXISTS contact_county TEXT,
  ADD COLUMN IF NOT EXISTS colony_state TEXT,
  ADD COLUMN IF NOT EXISTS relationship_to_cats TEXT,
  ADD COLUMN IF NOT EXISTS pregnant_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feeding_cats BOOLEAN,
  ADD COLUMN IF NOT EXISTS feeder_if_not TEXT,
  ADD COLUMN IF NOT EXISTS trapping_experience TEXT,
  ADD COLUMN IF NOT EXISTS need_traps BOOLEAN,
  ADD COLUMN IF NOT EXISTS willing_to_trap_transport TEXT,
  ADD COLUMN IF NOT EXISTS able_to_trap_transport TEXT,
  ADD COLUMN IF NOT EXISTS how_heard TEXT,
  ADD COLUMN IF NOT EXISTS apartment_name TEXT,
  ADD COLUMN IF NOT EXISTS resolution TEXT,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trapper_trap_loaner TEXT,
  ADD COLUMN IF NOT EXISTS additional_notes TEXT,
  ADD COLUMN IF NOT EXISTS outcome_tnvr_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outcome_acc_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outcome_foster_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outcome_other_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cats_remaining INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS intake_notes TEXT,
  ADD COLUMN IF NOT EXISTS outcome TEXT,
  ADD COLUMN IF NOT EXISTS closure_notes TEXT,
  ADD COLUMN IF NOT EXISTS can_help BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_traps BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_transport BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consent_communications BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS claimed_by_email TEXT,
  ADD COLUMN IF NOT EXISTS claimed_by_name TEXT,
  ADD COLUMN IF NOT EXISTS assigned_team_id UUID,
  ADD COLUMN IF NOT EXISTS assigned_team_name TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_log JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS follow_up_due_date DATE,
  ADD COLUMN IF NOT EXISTS medical_flags JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS medical_flag_dismissed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS medical_flag_forced BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS history_log JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS colony_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS colony_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE UNIQUE INDEX IF NOT EXISTS help_requests_case_number_key
  ON help_requests (case_number)
  WHERE case_number IS NOT NULL AND case_number <> '';

CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.case_number IS NULL OR NEW.case_number = '' THEN
    NEW.case_number := 'CASE-' || LPAD(nextval('help_request_case_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_case_number ON help_requests;
CREATE TRIGGER set_case_number
  BEFORE INSERT ON help_requests
  FOR EACH ROW
  EXECUTE FUNCTION generate_case_number();
