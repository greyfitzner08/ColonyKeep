DO $$ BEGIN
  CREATE TYPE gcaa_member_status AS ENUM ('active', 'pending', 'expired', 'no');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE community_partners
  ADD COLUMN IF NOT EXISTS gcaa_member_status gcaa_member_status;

UPDATE community_partners
SET gcaa_member_status = CASE
  WHEN is_active THEN 'active'::gcaa_member_status
  ELSE 'no'::gcaa_member_status
END
WHERE organization_type = 'gcaa'
  AND gcaa_member_status IS NULL;

COMMENT ON COLUMN community_partners.gcaa_member_status IS
  'GCAA apartment community membership: active, pending, expired, or no.';
