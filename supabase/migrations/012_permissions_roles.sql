-- Role-aware case and appointment access tied to platform role + volunteer interests

CREATE OR REPLACE FUNCTION profile_volunteer_roles()
RETURNS TEXT[] AS $$
  SELECT COALESCE(volunteer_roles, '{}') FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_case_worker()
RETURNS BOOLEAN AS $$
  SELECT is_admin()
    OR get_user_role() IN ('inquiry_team', 'trap_team_lead')
    OR (
      get_user_role() = 'volunteer'
      AND (
        'intake_representative' = ANY(profile_volunteer_roles())
        OR profile_volunteer_roles() && ARRAY['trapper', 'trap_loaner', 'transporter', 'recovery']::TEXT[]
      )
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION can_manage_appointments()
RETURNS BOOLEAN AS $$
  SELECT is_admin()
    OR get_user_role() IN ('trap_team_lead', 'clinic_coordination')
    OR (
      get_user_role() = 'volunteer'
      AND profile_volunteer_roles() && ARRAY['trapper', 'trap_loaner', 'transporter', 'recovery']::TEXT[]
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

DROP POLICY IF EXISTS "Help request read access" ON help_requests;
CREATE POLICY "Help request read access" ON help_requests FOR SELECT USING (
  is_case_worker()
  OR get_user_role() = 'clinic_coordination'
);

DROP POLICY IF EXISTS "Staff can update help requests" ON help_requests;
CREATE POLICY "Staff can update help requests" ON help_requests FOR UPDATE USING (
  is_case_worker()
);

DROP POLICY IF EXISTS "Staff manage appointments" ON appointments;
CREATE POLICY "Staff manage appointments" ON appointments FOR ALL USING (
  can_manage_appointments()
  OR (get_user_role() = 'volunteer' AND reserved_by = get_user_email())
);

DROP POLICY IF EXISTS "Team members read announcements" ON team_announcements;
CREATE POLICY "Team members read announcements" ON team_announcements FOR SELECT USING (
  get_user_role() IS NOT NULL
);

DROP POLICY IF EXISTS "Volunteers update shift signup" ON shifts;
DROP POLICY IF EXISTS "Volunteers update shifts signup" ON shifts;
CREATE POLICY "Volunteers update shift signup" ON shifts FOR UPDATE USING (
  get_user_role() IS NOT NULL
);
