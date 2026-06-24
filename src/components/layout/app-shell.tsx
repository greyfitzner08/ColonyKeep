import { getCurrentProfile } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { VolunteerGate } from "@/components/layout/volunteer-gate";
import { VolunteerApplicationGate } from "@/components/layout/volunteer-application-gate";
import { VolunteerRequirementsGate } from "@/components/layout/volunteer-requirements-gate";
import { SupabaseConfigGate } from "@/components/layout/supabase-config-gate";
import { BirthdayGate } from "@/components/layout/birthday-gate";
import { isKnownUserRole } from "@/lib/constants";
import { hasSupabaseServerConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  isApplicationPendingReview,
  requiresVolunteerApplication,
  requiresVolunteerRequirementCompletion,
} from "@/lib/volunteers/application-requirements";
import type { VolunteerApplication } from "@/lib/types";

export async function AppShell({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseServerConfig()) {
    return <SupabaseConfigGate />;
  }

  const profile = await getCurrentProfile();

  let application: VolunteerApplication | null = null;
  if (profile?.email) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("volunteer_applications")
      .select("*")
      .eq("email", profile.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    application = (data as VolunteerApplication | null) ?? null;
  }

  if (profile && requiresVolunteerApplication(profile, application)) {
    return <VolunteerApplicationGate profile={profile} />;
  }

  if (profile && isApplicationPendingReview(profile, application)) {
    return <VolunteerGate />;
  }

  if (profile && application && requiresVolunteerRequirementCompletion(profile, application)) {
    return <VolunteerRequirementsGate profile={profile} application={application} />;
  }

  if (!isKnownUserRole(profile?.role)) {
    return <VolunteerGate />;
  }

  const needsBirthday =
    profile != null &&
    Object.prototype.hasOwnProperty.call(profile, "birthday") &&
    !profile.birthday;

  return (
    <div className="min-h-screen bg-background">
      {needsBirthday && (
        <BirthdayGate userName={profile.full_name ?? profile.email} />
      )}
      <Sidebar profile={profile} userName={profile.full_name ?? profile.email} />
      <main className="lg:pl-64">
        <div className="container mx-auto p-4 lg:p-8 pt-16 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
