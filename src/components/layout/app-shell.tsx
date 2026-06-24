import { getCurrentProfile } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { VolunteerGate } from "@/components/layout/volunteer-gate";
import { SupabaseConfigGate } from "@/components/layout/supabase-config-gate";
import { BirthdayGate } from "@/components/layout/birthday-gate";
import { isKnownUserRole } from "@/lib/constants";
import { hasSupabaseServerConfig } from "@/lib/supabase/env";

export async function AppShell({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseServerConfig()) {
    return <SupabaseConfigGate />;
  }

  const profile = await getCurrentProfile();

  if (!isKnownUserRole(profile?.role)) {
    return <VolunteerGate />;
  }

  const needsBirthday = !profile?.birthday;

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
