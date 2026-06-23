-- Align cats RLS with case worker and appointment manager permissions

DROP POLICY IF EXISTS "Staff read cats" ON cats;
DROP POLICY IF EXISTS "Staff manage cats" ON cats;

CREATE POLICY "Staff read cats" ON cats FOR SELECT USING (
  is_case_worker()
  OR can_manage_appointments()
  OR get_user_role() = 'clinic_coordination'
);

CREATE POLICY "Staff insert cats" ON cats FOR INSERT WITH CHECK (
  is_case_worker() OR can_manage_appointments()
);

CREATE POLICY "Staff update cats" ON cats FOR UPDATE USING (
  is_case_worker() OR can_manage_appointments()
);

CREATE POLICY "Admins delete cats" ON cats FOR DELETE USING (is_admin());
