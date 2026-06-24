-- Public borrower contact (separate from TNVR volunteer who keeps the equipment)

ALTER TABLE trap_equipment_items
  ADD COLUMN IF NOT EXISTS borrower_name TEXT,
  ADD COLUMN IF NOT EXISTS borrower_email TEXT,
  ADD COLUMN IF NOT EXISTS borrower_phone TEXT;
