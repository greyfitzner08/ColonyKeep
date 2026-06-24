-- Equipment QR scan data and physical label tracking

ALTER TABLE trap_equipment_items
  ADD COLUMN IF NOT EXISTS is_labeled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS equipment_label TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_data TEXT;

CREATE INDEX IF NOT EXISTS idx_trap_equipment_label ON trap_equipment_items(equipment_label)
  WHERE equipment_label IS NOT NULL;
