-- Track volunteer roles removed by admins (including built-in catalog roles).

CREATE TABLE disabled_volunteer_roles (
  role_id volunteer_role PRIMARY KEY,
  disabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE disabled_volunteer_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read disabled volunteer roles" ON disabled_volunteer_roles;
CREATE POLICY "Public read disabled volunteer roles" ON disabled_volunteer_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage disabled volunteer roles" ON disabled_volunteer_roles;
CREATE POLICY "Admin manage disabled volunteer roles" ON disabled_volunteer_roles FOR ALL USING (is_admin());
