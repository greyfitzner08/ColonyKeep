import { VolunteerSignupWizard } from "@/components/volunteers/volunteer-signup-wizard";
import { getPlatformBranding } from "@/lib/branding-server";
import { createClient } from "@/lib/supabase/server";
import { fetchVolunteerRoleCatalogInputs } from "@/lib/volunteers/load-role-catalog";

export default async function VolunteerSignupPage() {
  const supabase = await createClient();
  const [{ signupCatalog }, branding] = await Promise.all([
    fetchVolunteerRoleCatalogInputs(supabase),
    getPlatformBranding(),
  ]);

  return (
    <VolunteerSignupWizard
      variant="page"
      signupRoleCatalog={signupCatalog}
      signupSteps={branding.volunteer_signup_steps}
    />
  );
}
