-- Additional per-cat tracking fields for trap/clinic workflow.

ALTER TABLE cats
  ADD COLUMN IF NOT EXISTS microchip_id TEXT,
  ADD COLUMN IF NOT EXISTS medical_notes TEXT;
