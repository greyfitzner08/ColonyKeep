-- Trap team equipment inventory (traps, scanners, etc.)

CREATE TABLE IF NOT EXISTS trap_equipment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_type TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'available' CHECK (
    status IN ('available', 'loaned', 'maintenance', 'retired')
  ),
  team_id UUID REFERENCES trap_teams(id) ON DELETE SET NULL,
  team_name TEXT,
  location TEXT,
  notes TEXT,
  logged_by_email TEXT NOT NULL,
  logged_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trap_equipment_team ON trap_equipment_items(team_id);
CREATE INDEX IF NOT EXISTS idx_trap_equipment_type ON trap_equipment_items(equipment_type);

CREATE TRIGGER update_trap_equipment_items_updated_at
  BEFORE UPDATE ON trap_equipment_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE trap_equipment_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION can_manage_trap_equipment()
RETURNS BOOLEAN AS $$
  SELECT is_admin()
    OR get_user_role() = 'trap_team_lead'
    OR (
      get_user_role() = 'volunteer'
      AND profile_volunteer_roles() && ARRAY['trapper', 'trap_loaner', 'transporter', 'recovery']::TEXT[]
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

DROP POLICY IF EXISTS "TNVR volunteers read equipment" ON trap_equipment_items;
CREATE POLICY "TNVR volunteers read equipment" ON trap_equipment_items FOR SELECT USING (
  can_manage_trap_equipment()
);

DROP POLICY IF EXISTS "TNVR volunteers manage equipment" ON trap_equipment_items;
CREATE POLICY "TNVR volunteers manage equipment" ON trap_equipment_items FOR ALL USING (
  can_manage_trap_equipment()
);
