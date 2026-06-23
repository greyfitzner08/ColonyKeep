-- Sync live Supabase schema with app requirements.
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM (
    'available', 'reserved', 'confirmed_transport', 'checked_in', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE volunteer_application_status AS ENUM (
    'pending', 'approved', 'rejected', 'needs_followup'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE volunteer_role AS ENUM (
    'intake_representative', 'trapper', 'trap_loaner', 'transporter', 'recovery',
    'event_volunteer', 'grant_writing', 'social_media', 'snack_patrol', 'crafter',
    'story_writer', 'photographer', 'videographer', 'community_outreach', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE shift_type AS ENUM (
    'trapping', 'transport', 'clinic', 'event', 'recovery', 'admin', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE shift_required_role AS ENUM (
    'any', 'tnvr_volunteer', 'intake_representative', 'event_volunteer'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public_booking_status AS ENUM (
    'pending', 'confirmed', 'expired', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS trap_teams (
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

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_id UUID;

DO $$ BEGIN
  ALTER TABLE profiles
    ADD CONSTRAINT profiles_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES trap_teams(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE volunteer_applications
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS clinics (
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

CREATE TABLE IF NOT EXISTS cats (
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

CREATE TABLE IF NOT EXISTS appointments (
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

DO $$ BEGIN
  ALTER TABLE cats
    ADD CONSTRAINT cats_appointment_id_fkey
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS shifts (
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

CREATE TABLE IF NOT EXISTS volunteer_hours (
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

CREATE TABLE IF NOT EXISTS team_announcements (
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

CREATE TABLE IF NOT EXISTS public_clinic_events (
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

CREATE TABLE IF NOT EXISTS public_bookings (
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

CREATE TABLE IF NOT EXISTS role_descriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id volunteer_role NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_team_id()
RETURNS UUID AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_email()
RETURNS TEXT AS $$
  SELECT email FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('admin', 'inquiry_team', 'trap_team_lead', 'clinic_coordination');
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

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

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
CREATE POLICY "Admins can manage profiles" ON profiles FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Staff can read teams" ON trap_teams;
CREATE POLICY "Staff can read teams" ON trap_teams FOR SELECT USING (is_staff() OR get_user_role() = 'volunteer');

DROP POLICY IF EXISTS "Admins manage teams" ON trap_teams;
CREATE POLICY "Admins manage teams" ON trap_teams FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Public can create help requests" ON help_requests;
CREATE POLICY "Public can create help requests" ON help_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Help request read access" ON help_requests;
CREATE POLICY "Help request read access" ON help_requests FOR SELECT USING (
  is_admin()
  OR get_user_role() IN ('inquiry_team', 'clinic_coordination')
  OR get_user_role() = 'trap_team_lead'
  OR get_user_role() = 'volunteer'
);

DROP POLICY IF EXISTS "Staff can update help requests" ON help_requests;
CREATE POLICY "Staff can update help requests" ON help_requests FOR UPDATE USING (
  is_admin()
  OR get_user_role() IN ('inquiry_team', 'clinic_coordination', 'trap_team_lead', 'volunteer')
);

DROP POLICY IF EXISTS "Admins can delete help requests" ON help_requests;
CREATE POLICY "Admins can delete help requests" ON help_requests FOR DELETE USING (is_admin());

DROP POLICY IF EXISTS "Staff read clinics" ON clinics;
CREATE POLICY "Staff read clinics" ON clinics FOR SELECT USING (is_staff() OR get_user_role() = 'volunteer');

DROP POLICY IF EXISTS "Clinic coord manage clinics" ON clinics;
CREATE POLICY "Clinic coord manage clinics" ON clinics FOR ALL USING (is_admin() OR get_user_role() = 'clinic_coordination');

DROP POLICY IF EXISTS "Staff read appointments" ON appointments;
CREATE POLICY "Staff read appointments" ON appointments FOR SELECT USING (is_staff() OR get_user_role() = 'volunteer');

DROP POLICY IF EXISTS "Staff manage appointments" ON appointments;
CREATE POLICY "Staff manage appointments" ON appointments FOR ALL USING (
  is_admin() OR get_user_role() IN ('clinic_coordination', 'trap_team_lead', 'inquiry_team')
  OR (get_user_role() = 'volunteer' AND reserved_by = get_user_email())
);

DROP POLICY IF EXISTS "Public can apply" ON volunteer_applications;
CREATE POLICY "Public can apply" ON volunteer_applications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage applications" ON volunteer_applications;
CREATE POLICY "Admins manage applications" ON volunteer_applications FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Applicants read own" ON volunteer_applications;
CREATE POLICY "Applicants read own" ON volunteer_applications FOR SELECT USING (email = get_user_email());

DROP POLICY IF EXISTS "Volunteers read shifts" ON shifts;
CREATE POLICY "Volunteers read shifts" ON shifts FOR SELECT USING (get_user_role() IS NOT NULL);

DROP POLICY IF EXISTS "Admins manage shifts" ON shifts;
CREATE POLICY "Admins manage shifts" ON shifts FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Volunteers update shift signup" ON shifts;
CREATE POLICY "Volunteers update shift signup" ON shifts FOR UPDATE USING (get_user_role() = 'volunteer' OR is_admin());

DROP POLICY IF EXISTS "Volunteers manage own hours" ON volunteer_hours;
CREATE POLICY "Volunteers manage own hours" ON volunteer_hours FOR ALL USING (
  volunteer_email = get_user_email() OR is_admin() OR get_user_role() = 'trap_team_lead'
);

DROP POLICY IF EXISTS "Staff read hours" ON volunteer_hours;
CREATE POLICY "Staff read hours" ON volunteer_hours FOR SELECT USING (is_staff());

DROP POLICY IF EXISTS "Team members read announcements" ON team_announcements;
CREATE POLICY "Team members read announcements" ON team_announcements FOR SELECT USING (
  team_id IS NULL OR team_id = get_user_team_id() OR is_admin() OR get_user_role() IN ('inquiry_team', 'clinic_coordination')
);

DROP POLICY IF EXISTS "Staff create announcements" ON team_announcements;
CREATE POLICY "Staff create announcements" ON team_announcements FOR INSERT WITH CHECK (get_user_role() IS NOT NULL);

DROP POLICY IF EXISTS "Authors update announcements" ON team_announcements;
CREATE POLICY "Authors update announcements" ON team_announcements FOR UPDATE USING (author_email = get_user_email() OR is_admin());

DROP POLICY IF EXISTS "Public read active events" ON public_clinic_events;
CREATE POLICY "Public read active events" ON public_clinic_events FOR SELECT USING (is_active = true OR is_staff() OR is_admin());

DROP POLICY IF EXISTS "Staff manage events" ON public_clinic_events;
CREATE POLICY "Staff manage events" ON public_clinic_events FOR ALL USING (is_admin() OR get_user_role() = 'clinic_coordination');

DROP POLICY IF EXISTS "Public create bookings" ON public_bookings;
CREATE POLICY "Public create bookings" ON public_bookings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Staff read bookings" ON public_bookings;
CREATE POLICY "Staff read bookings" ON public_bookings FOR SELECT USING (is_staff() OR is_admin());

DROP POLICY IF EXISTS "Staff manage bookings" ON public_bookings;
CREATE POLICY "Staff manage bookings" ON public_bookings FOR UPDATE USING (is_admin() OR get_user_role() = 'clinic_coordination');

DROP POLICY IF EXISTS "Public read role descriptions" ON role_descriptions;
CREATE POLICY "Public read role descriptions" ON role_descriptions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage role descriptions" ON role_descriptions;
CREATE POLICY "Admin manage role descriptions" ON role_descriptions FOR ALL USING (is_admin());

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
  ('other', 'Other', 'Other volunteer contributions not listed above.')
ON CONFLICT (role_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
CREATE INDEX IF NOT EXISTS idx_public_clinic_events_date ON public_clinic_events(date);
CREATE INDEX IF NOT EXISTS idx_volunteer_applications_status ON volunteer_applications(status);
