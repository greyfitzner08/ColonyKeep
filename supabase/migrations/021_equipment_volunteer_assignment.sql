-- Link equipment to the TNVR volunteer who has it (especially when loaned out)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE trap_equipment_items
  ADD COLUMN IF NOT EXISTS assigned_to_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trap_equipment_assignee
  ON trap_equipment_items(assigned_to_profile_id);
