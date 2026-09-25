-- Intro copy and donate link on the public colony request form.

ALTER TABLE platform_branding
  ADD COLUMN IF NOT EXISTS intake_donate_url TEXT,
  ADD COLUMN IF NOT EXISTS intake_donate_text TEXT,
  ADD COLUMN IF NOT EXISTS intake_about_message TEXT;

UPDATE platform_branding
SET
  intake_donate_url = COALESCE(
    NULLIF(btrim(intake_donate_url), ''),
    'https://givebutter.com/mobile-tnvr-clinic-atzvj9'
  ),
  intake_donate_text = COALESCE(
    NULLIF(btrim(intake_donate_text), ''),
    'Donate to our mobile clinics'
  ),
  intake_about_message = COALESCE(
    NULLIF(btrim(intake_about_message), ''),
    $intro$Friends of Feral Felines is a 100% volunteer-run nonprofit serving Mecklenburg County. We do not have paid employees.

If you are reporting 5 or fewer cats, we will reach out with Trap School dates. You are welcome to come learn how to TNVR (trap, spay-neuter, vaccinate, and return) community cats yourself. We offer training, can help with financial assistance, and lend humane traps and other equipment.

We are here to help. Our volunteers cannot do this work alone, and we need neighbors to take part. Start today: log your case, and talk with neighbors, coworkers, family, and friends about helping with the TNVR work or with a donation.

By submitting a request for help, you agree to receive occasional communications from Friends of Feral Felines via email.$intro$
  )
WHERE id = 1;
