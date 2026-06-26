import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { canViewVolunteerDirectory } from "@/lib/permissions";
import { loadVolunteerDirectory } from "@/lib/team-directory/load-directory";
import { VolunteerDirectoryTable } from "@/components/team-directory/volunteer-directory-table";

export default async function TeamDirectoryPage() {
  const profile = await getAppProfile();
  if (!canViewVolunteerDirectory(profile)) redirect("/");

  const service = await createServiceClient();
  const { entries, teams } = await loadVolunteerDirectory(service);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Team Directory</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Contact information for approved volunteers and staff. Available to team members 18 and
          older.
        </p>
      </div>

      <VolunteerDirectoryTable entries={entries} teams={teams} />
    </div>
  );
}
