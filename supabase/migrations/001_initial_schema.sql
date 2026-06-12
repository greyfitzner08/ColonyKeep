-- TNVR Colony Management Platform - Initial Schema

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM (
  'admin', 'inquiry_team', 'trap_team_lead', 'clinic_coordination', 'volunteer'
);

CREATE TYPE help_request_status AS ENUM (
  'new_intake', 'under_review', 'needs_more_info', 'routed_to_trap_team',
  'claimed', 'appointment_needed', 'appointment_reserved', 'cat_trapped',
  'transported', 'checked_in', 'completed', 'closed'
);

CREATE TYPE appointment_status AS ENUM (
  'available', 'reserved', 'confirmed_transport', 'checked_in', 'completed', 'cancelled'
);

CREATE TYPE volunteer_application_status AS ENUM (
  'pending', 'approved', 'rejected', 'needs_followup'
);

CREATE TYPE volunteer_role AS ENUM (
  'intake_representative', 'trapper', 'trap_loaner', 'transporter', 'recovery',
  'event_volunteer', 'grant_writing', 'social_media', 'snack_patrol', 'crafter',
  'story_writer', 'photographer', 'videographer', 'community_outreach', 'other'
);

CREATE TYPE shift_type AS ENUM (
  'trapping', 'transport', 'clinic', 'event', 'recovery', 'admin', 'other'
);

CREATE TYPE shift_required_role AS ENUM (
  'any', 'tnvr_volunteer', 'intake_representative', 'event_volunteer'
);

CREATE TYPE public_booking_status AS ENUM (
  'pending', 'confirmed', 'expired', 'cancelled'
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role,
  team_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trap Teams
CREATE TABLE trap_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  zip_codes TEXT[] DEFAULT '{}',
  members TEXT[] DEFAULT '{}',
  lead_email TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD CONSTRAINT profiles_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES trap_teams(id) ON DELETE SET NULL;

-- Help Requests
CREATE TABLE help_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_number TEXT UNIQUE NOT NULL DEFAULT '',
  status help_request_status DEFAULT 'new_intake',
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  colony_address TEXT NOT NULL,
  colony_city TEXT NOT NULL,
  colony_county TEXT NOT NULL,
  colony_zip TEXT NOT NULL,
  colony_lat DOUBLE PRECISION,
  colony_lng DOUBLE PRECISION,
  kittens_under_8_weeks INTEGER DEFAULT 0,
  cats_over_8_weeks INTEGER DEFAULT 0,
  can_help BOOLEAN DEFAULT FALSE,
  has_traps BOOLEAN DEFAULT FALSE,
  can_transport BOOLEAN DEFAULT FALSE,
  has_recovery_space BOOLEAN DEFAULT FALSE,
  consent_communications BOOLEAN DEFAULT FALSE,
  assigned_team_id UUID REFERENCES trap_teams(id) ON DELETE SET NULL,
  assigned_team_name TEXT,
  claimed_by_email TEXT,
  claimed_by_name TEXT,
  intake_notes TEXT,
  follow_up_log JSONB DEFAULT '[]',
  follow_up_due_date DATE,
  medical_flags JSONB DEFAULT '[]',
  medical_flag_dismissed BOOLEAN DEFAULT FALSE,
  medical_flag_forced BOOLEAN DEFAULT FALSE,
  outcome TEXT,
  closure_notes TEXT,
  history_log JSONB DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE help_request_case_seq START 1;

CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.case_number := 'CASE-' || LPAD(nextval('help_request_case_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_case_number
  BEFORE INSERT ON help_requests
  FOR EACH ROW
  WHEN (NEW.case_number IS NULL OR NEW.case_number = '')
  EXECUTE FUNCTION generate_case_number();

-- Clinics
CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  operating_days TEXT[] DEFAULT '{}',
  slots_per_day INTEGER DEFAULT 10,
  slots_by_day JSONB DEFAULT '{}',
  included_services TEXT[] DEFAULT '{}',
  packages JSONB DEFAULT '[]',
  addon_services JSONB DEFAULT '[]',
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cats
CREATE TABLE cats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  help_request_id UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
  name TEXT,
  gender TEXT,
  colors TEXT,
  breed TEXT,
  description TEXT,
  estimated_status TEXT,
  trapped_status TEXT,
  appointment_status TEXT,
  appointment_id UUID,
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  clinic_name TEXT,
  return_status TEXT,
  foster_program TEXT,
  foster_name TEXT,
  foster_email TEXT,
  foster_phone TEXT,
  trap_date DATE,
  transport_date DATE,
  return_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  clinic_name TEXT NOT NULL,
  date DATE NOT NULL,
  total_slots INTEGER DEFAULT 1,
  reserved_slots INTEGER DEFAULT 0,
  help_request_id UUID REFERENCES help_requests(id) ON DELETE SET NULL,
  cat_id UUID REFERENCES cats(id) ON DELETE SET NULL,
  reserved_by TEXT,
  reserved_by_name TEXT,
  status appointment_status DEFAULT 'available',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  cat_name TEXT,
  cat_colors TEXT,
  cat_breed TEXT,
  cat_gender TEXT,
  transporter_name TEXT,
  transporter_email TEXT,
  transporter_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cats ADD CONSTRAINT cats_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;

-- Volunteer Applications
CREATE TABLE volunteer_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status volunteer_application_status DEFAULT 'pending',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  birthday DATE NOT NULL,
  roles_requested volunteer_role[] DEFAULT '{}',
  why_volunteer TEXT NOT NULL,
  prior_experience TEXT,
  availability TEXT,
  how_heard TEXT,
  liability_waiver_signed BOOLEAN DEFAULT FALSE,
  shadow_completed BOOLEAN DEFAULT FALSE,
  policy_signed BOOLEAN DEFAULT FALSE,
  intake_training BOOLEAN DEFAULT FALSE,
  tnvr_certificate_uploaded BOOLEAN DEFAULT FALSE,
  tnvr_certificate_url TEXT,
  event_crash_course BOOLEAN DEFAULT FALSE,
  admin_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shifts
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name TEXT NOT NULL,
  shift_type shift_type NOT NULL,
  required_roles shift_required_role DEFAULT 'any',
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT NOT NULL,
  team_ids UUID[] DEFAULT '{}',
  volunteers_needed INTEGER DEFAULT 1,
  signed_up_emails TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Volunteer Hours
CREATE TABLE volunteer_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  volunteer_email TEXT NOT NULL,
  volunteer_name TEXT NOT NULL,
  team_id UUID REFERENCES trap_teams(id) ON DELETE SET NULL,
  team_name TEXT,
  date DATE NOT NULL,
  hours NUMERIC(5,2) NOT NULL,
  hour_type TEXT NOT NULL,
  help_request_id UUID REFERENCES help_requests(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Announcements
CREATE TABLE team_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message TEXT NOT NULL,
  team_id UUID REFERENCES trap_teams(id) ON DELETE SET NULL,
  team_name TEXT,
  author_email TEXT NOT NULL,
  author_name TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  is_birthday BOOLEAN DEFAULT FALSE,
  birthday_person_name TEXT,
  comments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public Clinic Events
CREATE TABLE public_clinic_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  clinic_name TEXT NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  location TEXT NOT NULL,
  total_spots INTEGER NOT NULL,
  description TEXT,
  included_services TEXT[] DEFAULT '{}',
  addon_services JSONB DEFAULT '[]',
  base_price NUMERIC(10,2) DEFAULT 0,
  cost_description TEXT,
  payment_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public Bookings
CREATE TABLE public_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public_clinic_events(id) ON DELETE CASCADE,
  status public_booking_status DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  cat_name TEXT,
  cat_colors TEXT,
  cat_breed TEXT,
  cat_gender TEXT,
  has_injuries BOOLEAN DEFAULT FALSE,
  injury_details TEXT,
  selected_addons TEXT[] DEFAULT '{}',
  total_price NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role Descriptions
CREATE TABLE role_descriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id volunteer_role NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_trap_teams_updated_at BEFORE UPDATE ON trap_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_help_requests_updated_at BEFORE UPDATE ON help_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON clinics FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_cats_updated_at BEFORE UPDATE ON cats FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_volunteer_applications_updated_at BEFORE UPDATE ON volunteer_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_team_announcements_updated_at BEFORE UPDATE ON team_announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_public_clinic_events_updated_at BEFORE UPDATE ON public_clinic_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_public_bookings_updated_at BEFORE UPDATE ON public_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_role_descriptions_updated_at BEFORE UPDATE ON role_descriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- History log trigger for status changes
CREATE OR REPLACE FUNCTION log_help_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.history_log = COALESCE(NEW.history_log, '[]'::jsonb) || jsonb_build_object(
      'timestamp', NOW(),
      'action', 'status_change',
      'actor_email', NULL,
      'actor_name', NULL,
      'details', OLD.status::text || ' → ' || NEW.status::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER help_request_status_history
  BEFORE UPDATE ON help_requests
  FOR EACH ROW
  EXECUTE FUNCTION log_help_request_status_change();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Seed default role descriptions
INSERT INTO role_descriptions (role_id, label, description) VALUES
  ('intake_representative', 'Intake Representative', 'Answer calls and emails from civilians reporting colonies. Guide them through the intake process.'),
  ('trapper', 'Trapper', 'Set and monitor traps at colony sites. Requires TNVR certification.'),
  ('trap_loaner', 'Trap Loaner', 'Loan traps to civilians and provide trapping guidance. Requires TNVR certification.'),
  ('transporter', 'Transporter', 'Transport trapped cats to and from clinic appointments. Requires TNVR certification.'),
  ('recovery', 'Recovery Space Provider', 'Provide overnight recovery space for cats post-surgery. Requires TNVR certification.'),
  ('event_volunteer', 'Event Volunteer', 'Help at TNVR clinic events, community outreach days, and fundraisers.'),
  ('grant_writing', 'Grant Writing', 'Research and write grant applications to fund TNVR operations.'),
  ('social_media', 'Social Media', 'Manage social media accounts and create content to raise awareness.'),
  ('snack_patrol', 'Snack Patrol', 'Provide food and drinks for volunteers at events and trapping sessions.'),
  ('crafter', 'Crafter', 'Create handmade items for fundraisers and volunteer appreciation.'),
  ('story_writer', 'Story Writer', 'Write success stories and case updates for newsletters and social media.'),
  ('photographer', 'Photographer', 'Document TNVR operations and create visual content.'),
  ('videographer', 'Videographer', 'Create video content for training, outreach, and social media.'),
  ('community_outreach', 'Community Outreach', 'Engage with community members about TNVR and responsible cat care.'),
  ('other', 'Other', 'Other volunteer contributions not listed above.');

-- RLS Helper functions
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_team_id()
RETURNS UUID AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_email()
RETURNS TEXT AS $$
  SELECT email FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('admin', 'inquiry_team', 'trap_team_lead', 'clinic_coordination');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trap_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_clinic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_descriptions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "Admins can manage profiles" ON profiles FOR ALL USING (is_admin());

-- Trap teams policies
CREATE POLICY "Staff can read teams" ON trap_teams FOR SELECT USING (is_staff() OR get_user_role() = 'volunteer');
CREATE POLICY "Admins manage teams" ON trap_teams FOR ALL USING (is_admin());

-- Help requests policies
CREATE POLICY "Public can create help requests" ON help_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Help request read access" ON help_requests FOR SELECT USING (
  is_admin()
  OR get_user_role() IN ('inquiry_team', 'clinic_coordination')
  OR (get_user_role() = 'trap_team_lead' AND assigned_team_id = get_user_team_id())
  OR (get_user_role() = 'volunteer' AND (
    assigned_team_id = get_user_team_id()
    OR claimed_by_email = get_user_email()
    OR created_by = auth.uid()
  ))
);
CREATE POLICY "Staff can update help requests" ON help_requests FOR UPDATE USING (
  is_admin()
  OR get_user_role() IN ('inquiry_team', 'clinic_coordination')
  OR (get_user_role() = 'trap_team_lead' AND assigned_team_id = get_user_team_id())
  OR (get_user_role() = 'volunteer' AND (
    assigned_team_id = get_user_team_id()
    OR claimed_by_email = get_user_email()
  ))
);
CREATE POLICY "Admins can delete help requests" ON help_requests FOR DELETE USING (is_admin());

-- Cats policies (follow help request access)
CREATE POLICY "Staff read cats" ON cats FOR SELECT USING (
  EXISTS (SELECT 1 FROM help_requests hr WHERE hr.id = cats.help_request_id AND (
    is_admin()
    OR get_user_role() IN ('inquiry_team', 'clinic_coordination')
    OR (get_user_role() = 'trap_team_lead' AND hr.assigned_team_id = get_user_team_id())
    OR (get_user_role() = 'volunteer' AND (hr.assigned_team_id = get_user_team_id() OR hr.claimed_by_email = get_user_email()))
  ))
);
CREATE POLICY "Staff manage cats" ON cats FOR ALL USING (
  is_admin()
  OR get_user_role() IN ('inquiry_team', 'clinic_coordination', 'trap_team_lead')
  OR (get_user_role() = 'volunteer' AND EXISTS (
    SELECT 1 FROM help_requests hr WHERE hr.id = cats.help_request_id
    AND (hr.assigned_team_id = get_user_team_id() OR hr.claimed_by_email = get_user_email())
  ))
);

-- Clinics policies
CREATE POLICY "Staff read clinics" ON clinics FOR SELECT USING (is_staff() OR get_user_role() = 'volunteer');
CREATE POLICY "Clinic coord manage clinics" ON clinics FOR ALL USING (is_admin() OR get_user_role() = 'clinic_coordination');

-- Appointments policies
CREATE POLICY "Staff read appointments" ON appointments FOR SELECT USING (is_staff() OR get_user_role() = 'volunteer');
CREATE POLICY "Staff manage appointments" ON appointments FOR ALL USING (
  is_admin() OR get_user_role() IN ('clinic_coordination', 'trap_team_lead', 'inquiry_team')
  OR (get_user_role() = 'volunteer' AND reserved_by = get_user_email())
);

-- Volunteer applications - public insert, admin read/update
CREATE POLICY "Public can apply" ON volunteer_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins manage applications" ON volunteer_applications FOR ALL USING (is_admin());
CREATE POLICY "Applicants read own" ON volunteer_applications FOR SELECT USING (email = get_user_email());

-- Shifts policies
CREATE POLICY "Volunteers read shifts" ON shifts FOR SELECT USING (get_user_role() IS NOT NULL);
CREATE POLICY "Admins manage shifts" ON shifts FOR ALL USING (is_admin());
CREATE POLICY "Volunteers update shift signup" ON shifts FOR UPDATE USING (get_user_role() = 'volunteer' OR is_admin());

-- Volunteer hours policies
CREATE POLICY "Volunteers manage own hours" ON volunteer_hours FOR ALL USING (
  volunteer_email = get_user_email() OR is_admin() OR get_user_role() = 'trap_team_lead'
);
CREATE POLICY "Staff read hours" ON volunteer_hours FOR SELECT USING (is_staff());

-- Team announcements policies
CREATE POLICY "Team members read announcements" ON team_announcements FOR SELECT USING (
  team_id IS NULL OR team_id = get_user_team_id() OR is_admin() OR get_user_role() IN ('inquiry_team', 'clinic_coordination')
);
CREATE POLICY "Staff create announcements" ON team_announcements FOR INSERT WITH CHECK (get_user_role() IS NOT NULL);
CREATE POLICY "Authors update announcements" ON team_announcements FOR UPDATE USING (author_email = get_user_email() OR is_admin());

-- Public clinic events - public read active, staff manage
CREATE POLICY "Public read active events" ON public_clinic_events FOR SELECT USING (is_active = true OR is_staff() OR is_admin());
CREATE POLICY "Staff manage events" ON public_clinic_events FOR ALL USING (is_admin() OR get_user_role() = 'clinic_coordination');

-- Public bookings - public insert, staff read
CREATE POLICY "Public create bookings" ON public_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff read bookings" ON public_bookings FOR SELECT USING (is_staff() OR is_admin());
CREATE POLICY "Staff manage bookings" ON public_bookings FOR UPDATE USING (is_admin() OR get_user_role() = 'clinic_coordination');

-- Role descriptions - public read, admin write
CREATE POLICY "Public read role descriptions" ON role_descriptions FOR SELECT USING (true);
CREATE POLICY "Admin manage role descriptions" ON role_descriptions FOR ALL USING (is_admin());

-- Storage bucket for TNVR certificates
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', false);

CREATE POLICY "Anyone can upload certificates" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'certificates');
CREATE POLICY "Admins read certificates" ON storage.objects FOR SELECT USING (bucket_id = 'certificates' AND is_admin());
CREATE POLICY "Applicants read own certificate" ON storage.objects FOR SELECT USING (
  bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Indexes
CREATE INDEX idx_help_requests_status ON help_requests(status);
CREATE INDEX idx_help_requests_team ON help_requests(assigned_team_id);
CREATE INDEX idx_help_requests_zip ON help_requests(colony_zip);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_clinic ON appointments(clinic_id);
CREATE INDEX idx_cats_help_request ON cats(help_request_id);
CREATE INDEX idx_volunteer_applications_status ON volunteer_applications(status);
CREATE INDEX idx_shifts_date ON shifts(date);
CREATE INDEX idx_public_clinic_events_date ON public_clinic_events(date);
