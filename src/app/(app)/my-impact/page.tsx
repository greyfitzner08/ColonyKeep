import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { MyImpactDashboard } from "@/components/volunteers/my-impact-dashboard";
import type { VolunteerHours, Shift } from "@/lib/types";

export default async function MyImpactPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const email = profile?.email ?? "";

  const [{ data: hours }, { data: shifts }] = await Promise.all([
    supabase.from("volunteer_hours").select("*").eq("volunteer_email", email).order("date", { ascending: false }),
    supabase.from("shifts").select("*").contains("signed_up_emails", [email]),
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
    </div>
  );
}
