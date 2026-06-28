-- Clinic coordination is a volunteer role, not a platform access role.

ALTER TYPE volunteer_role ADD VALUE IF NOT EXISTS 'clinic_coordination';

UPDATE profiles
SET
  role = 'volunteer',
  volunteer_roles = CASE
    WHEN 'clinic_coordination' = ANY(COALESCE(volunteer_roles, '{}'))
    THEN volunteer_roles
    ELSE array_append(COALESCE(volunteer_roles, '{}'), 'clinic_coordination')
  END
WHERE role = 'clinic_coordination';

CREATE OR REPLACE FUNCTION has_clinic_coordination_volunteer_role()
RETURNS BOOLEAN AS $$
  SELECT 'clinic_coordination' = ANY(profile_volunteer_roles());
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('admin', 'inquiry_team', 'trap_team_lead')
    OR has_clinic_coordination_volunteer_role();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION can_manage_appointments()
RETURNS BOOLEAN AS $$
  SELECT is_admin()
    OR get_user_role() = 'trap_team_lead'
    OR has_clinic_coordination_volunteer_role()
    OR (
      get_user_role() = 'volunteer'
      AND profile_volunteer_roles() && ARRAY['trapper', 'trap_loaner', 'transporter', 'recovery']::TEXT[]
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

DROP POLICY IF EXISTS "Help request read access" ON help_requests;
CREATE POLICY "Help request read access" ON help_requests FOR SELECT USING (
  is_case_worker()
  OR has_clinic_coordination_volunteer_role()
);

DROP POLICY IF EXISTS "Staff read cats" ON cats;
CREATE POLICY "Staff read cats" ON cats FOR SELECT USING (
  is_case_worker() OR can_manage_appointments()
);

DROP POLICY IF EXISTS "Clinic coord manage clinics" ON clinics;
CREATE POLICY "Clinic coord manage clinics" ON clinics FOR ALL USING (
  is_admin() OR has_clinic_coordination_volunteer_role()
);

DROP POLICY IF EXISTS "Staff manage events" ON public_clinic_events;
CREATE POLICY "Staff manage events" ON public_clinic_events FOR ALL USING (
  is_admin() OR has_clinic_coordination_volunteer_role()
);

DROP POLICY IF EXISTS "Staff manage bookings" ON public_bookings;
CREATE POLICY "Staff manage bookings" ON public_bookings FOR UPDATE USING (
  is_admin() OR has_clinic_coordination_volunteer_role()
);

INSERT INTO role_descriptions (role_id, label, description) VALUES
  (
    'clinic_coordination',
    'Clinic Coordination',
    'Manage clinic partnerships, appointment slots, and public clinic events.'
  )
ON CONFLICT (role_id) DO NOTHING;
