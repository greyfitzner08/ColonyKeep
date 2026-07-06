-- Control whether each volunteer role appears on the public signup form.

ALTER TABLE role_descriptions
ADD COLUMN IF NOT EXISTS is_signup_active BOOLEAN NOT NULL DEFAULT TRUE;
