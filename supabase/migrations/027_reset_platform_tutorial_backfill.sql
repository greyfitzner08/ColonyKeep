-- Earlier 026 drafts marked every existing profile as tutorial-complete on deploy.
-- Clear that so users can see the first-sign-in walkthrough and reopen it from Resources.
UPDATE profiles
SET platform_tutorial_completed_at = NULL
WHERE platform_tutorial_completed_at IS NOT NULL;
