import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { canViewVolunteerDirectory } from "@/lib/permissions";
import { loadVolunteerDirectory } from "@/lib/team-directory/load-directory";
import { PageHeader } from "@/components/layout/page-header";
import { VolunteerDirectoryTable } from "@/components/team-directory/volunteer-directory-table";

export default async function TeamDirectoryPage() {
  const profile = await getAppProfile();
  if (!canViewVolunteerDirectory(profile)) redirect("/");

  const service = await createServiceClient();
  const { entries, teams } = await loadVolunteerDirectory(service);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Directory"
        description="Contact information for approved volunteers and staff. Available to team members 18 and older."
      />
      <VolunteerDirectoryTable
        entries={entries}
        teams={teams}
        isAdmin={profile?.role === "admin"}
      />
    </div>
  );
}
