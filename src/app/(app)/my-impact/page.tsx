import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { MyImpactDashboard } from "@/components/volunteers/my-impact-dashboard";
import { VolunteerProfileRoles } from "@/components/volunteers/volunteer-profile-roles";
import type { VolunteerHours, Shift, VolunteerApplication, VolunteerRoleRequest } from "@/lib/types";

export default async function MyImpactPage() {
  const profile = await getAppProfile();
  const supabase = await createClient();
  const email = profile?.email ?? "";

  const [{ data: hours }, { data: shifts }, { data: application }, { data: roleRequests }] =
    await Promise.all([
    supabase.from("volunteer_hours").select("*").eq("volunteer_email", email).order("date", { ascending: false }),
    supabase.from("shifts").select("*").contains("signed_up_emails", [email]),
    supabase.from("volunteer_applications").select("*").eq("email", email).maybeSingle(),
    supabase.from("volunteer_role_requests").select("*").eq("email", email).order("created_at", { ascending: false }),
  ]);

  const { count: casesWorked } = await supabase
    .from("help_requests")
    .select("*", { count: "exact", head: true })
    .eq("claimed_by_email", email);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Impact</h1>
        <p className="text-muted-foreground">Your volunteer contributions</p>
      </div>
      <MyImpactDashboard
        hours={(hours ?? []) as VolunteerHours[]}
        shifts={(shifts ?? []) as Shift[]}
        casesWorked={casesWorked ?? 0}
        profile={profile}
      />
      {profile && (
        <VolunteerProfileRoles
          profile={profile}
          application={(application ?? null) as VolunteerApplication | null}
          roleRequests={(roleRequests ?? []) as VolunteerRoleRequest[]}
        />
      )}
    </div>
  );
}
