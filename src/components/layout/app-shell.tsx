import { getCurrentProfile } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { VolunteerGate } from "@/components/layout/volunteer-gate";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile?.role) {
    return <VolunteerGate />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={profile.role} userName={profile.full_name ?? profile.email} />
      <main className="lg:pl-64">
        <div className="container mx-auto p-4 lg:p-8 pt-16 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
