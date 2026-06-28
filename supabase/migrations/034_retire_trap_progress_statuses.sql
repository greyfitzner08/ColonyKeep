-- Retire cat_trapped, transported, and checked_in as help request statuses.

UPDATE help_requests
SET status = 'appointment_reserved'
WHERE status IN ('cat_trapped', 'transported', 'checked_in');
