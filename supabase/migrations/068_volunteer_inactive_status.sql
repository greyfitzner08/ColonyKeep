-- Inactive volunteers: keep history, block login until re-approved.

ALTER TYPE volunteer_application_status ADD VALUE IF NOT EXISTS 'inactive';
