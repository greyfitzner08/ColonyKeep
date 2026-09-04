import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { MyImpactDashboard } from "@/components/volunteers/my-impact-dashboard";
import { fetchUserCaseWorkHistory } from "@/lib/cases/user-work-history";
import type { VolunteerHours, Shift } from "@/lib/types";

export default async function MyImpactPage() {
  const profile = await getAppProfile();
  const supabase = await createClient();
  const email = profile?.email ?? "";

  const [{ data: hours }, { data: shifts }, caseWorkHistory] = await Promise.all([
    supabase.from("volunteer_hours").select("*").eq("volunteer_email", email).order("date", { ascending: false }),
    supabase.from("shifts").select("*").contains("signed_up_emails", [email]),
    fetchUserCaseWorkHistory(supabase, email, { limit: 100 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Impact</h1>
        <p className="text-muted-foreground">
          Your volunteer contributions — hours, shifts, and cases you have worked
        </p>
      </div>
      <MyImpactDashboard
        hours={(hours ?? []) as VolunteerHours[]}
        shifts={(shifts ?? []) as Shift[]}
        caseWorkHistory={caseWorkHistory}
        profile={profile}
      />
    </div>
  );
}
