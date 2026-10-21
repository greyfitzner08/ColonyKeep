-- Resources copy is for people who already have accounts.
UPDATE library_documents
SET description = 'Required for all volunteers. Reference copy of the waiver you agreed to when you applied.'
WHERE title = 'Liability Waiver'
  AND section = 'Volunteer Onboarding';
