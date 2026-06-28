import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">
          Update your contact details, privacy settings, and volunteer roles.
        </p>
      </div>
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
