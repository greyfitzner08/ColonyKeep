import { VolunteerSignupWizard } from "@/components/volunteers/volunteer-signup-wizard";
import { createClient } from "@/lib/supabase/server";
import { fetchVolunteerRoleCatalogInputs } from "@/lib/volunteers/load-role-catalog";

export default async function VolunteerSignupPage() {
  const supabase = await createClient();
  const { signupCatalog } = await fetchVolunteerRoleCatalogInputs(supabase);

  return <VolunteerSignupWizard variant="page" signupRoleCatalog={signupCatalog} />;
}
