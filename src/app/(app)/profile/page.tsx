import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { VolunteerProfileContactPanel } from "@/components/volunteers/volunteer-profile-contact-panel";
import { VolunteerContactPrivacyPanel } from "@/components/volunteers/volunteer-contact-privacy-panel";
import { VolunteerProfileRoles } from "@/components/volunteers/volunteer-profile-roles";
import type { VolunteerApplication, VolunteerRoleRequest } from "@/lib/types";

export default async function ProfilePage() {
  const profile = await getAppProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const [{ data: application }, { data: roleRequests }] = await Promise.all([
    supabase.from("volunteer_applications").select("*").eq("email", profile.email).maybeSingle(),
    supabase
      .from("volunteer_role_requests")
      .select("*")
      .eq("email", profile.email)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="My Profile"
        description="Update your contact details, privacy settings, and volunteer roles."
      />
      <VolunteerProfileContactPanel profile={profile} />
      <VolunteerContactPrivacyPanel profile={profile} />
      <VolunteerProfileRoles
        profile={profile}
        application={(application ?? null) as VolunteerApplication | null}
        roleRequests={(roleRequests ?? []) as VolunteerRoleRequest[]}
      />
    </div>
  );
}
