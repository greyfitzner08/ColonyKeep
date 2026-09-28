ALTER TABLE platform_branding
  ADD COLUMN IF NOT EXISTS adoption_entrance_button_text TEXT,
  ADD COLUMN IF NOT EXISTS adoption_entrance_button_url TEXT,
  ADD COLUMN IF NOT EXISTS adoption_entrance_links JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE platform_branding
SET adoption_entrance_about_message = $new$<p>Friends of Feral Felines is a 100% volunteer-run nonprofit serving Mecklenburg County. We do not have paid employees.</p><p>This rescue application is for a cat joining the adoption program. An adoption specialist reviews the information and approves or declines entry. Approved cats are added to Adoptable Cats. It is separate from the adoption application, which is for a person who wants to adopt a cat.</p><p>By submitting this rescue application, you agree to receive occasional communications from Friends of Feral Felines via email.</p>$new$
WHERE id = 1
  AND adoption_entrance_about_message = $old$<p>Friends of Feral Felines is a 100% volunteer-run nonprofit serving Mecklenburg County. We do not have paid employees.</p><p>This form is for a cat entering the adoption program. An adoption specialist reviews the information and approves or declines entry. It is separate from the adoption application, which is for a person who wants to adopt a cat.</p><p>By submitting this entrance application, you agree to receive occasional communications from Friends of Feral Felines via email.</p>$old$;
