-- In-app editable resource guides (markdown body on library_documents).
-- Seed content for Platform User Flows is ensured on Resources page load
-- via ensurePlatformUserFlowsDocument() so admins can edit it afterward.

ALTER TABLE library_documents
  ADD COLUMN IF NOT EXISTS body_markdown TEXT;

ALTER TABLE library_documents
  ALTER COLUMN file_url DROP NOT NULL;

ALTER TABLE library_documents
  ALTER COLUMN file_url SET DEFAULT '';

UPDATE library_documents
SET file_url = COALESCE(file_url, '')
WHERE file_url IS NULL;
