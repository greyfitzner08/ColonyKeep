-- Intake cases sitting in under_review with nobody holding the claim looked
-- "in review" forever. Two distinct causes, repaired separately.

-- 1. Imported claims whose email landed in claimed_by_name with claimed_by_email empty.
--    These cases are genuinely claimed, so restore the claim instead of releasing it.
UPDATE help_requests hr
SET
  claimed_by_email = lower(trim(hr.claimed_by_name)),
  claimed_by_name = COALESCE(p.full_name, hr.claimed_by_name)
FROM (SELECT id, email, full_name FROM profiles) p
WHERE hr.status = 'under_review'
  AND COALESCE(trim(hr.claimed_by_email), '') = ''
  AND trim(hr.claimed_by_name) LIKE '%@%'
  AND lower(p.email) = lower(trim(hr.claimed_by_name));

UPDATE help_requests
SET claimed_by_email = lower(trim(claimed_by_name))
WHERE status = 'under_review'
  AND COALESCE(trim(claimed_by_email), '') = ''
  AND trim(claimed_by_name) LIKE '%@%';

-- 2. Cases with no claim holder at all: under_review implied someone was reviewing.
--    Release the stage so they read as unclaimed work in the inquiry queue.
UPDATE help_requests
SET status = 'new_intake'
WHERE status = 'under_review'
  AND COALESCE(trim(claimed_by_email), '') = ''
  AND COALESCE(trim(claimed_by_name), '') = ''
  AND COALESCE(trim(assigned_to), '') = '';
