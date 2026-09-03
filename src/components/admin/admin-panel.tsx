"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminUsersManager } from "@/components/admin/admin-users-manager";
import { BrandingSettings } from "@/components/admin/branding-settings";
import { RoleDescriptionsManager } from "@/components/admin/role-descriptions-manager";
import { TrapTeamsManager } from "@/components/admin/trap-teams-manager";
import { VolunteerImporter } from "@/components/volunteers/volunteer-importer";
import type { PlatformBranding } from "@/lib/branding";
import type { Profile, TrapTeam, RoleDescription, VolunteerApplication, VolunteerRole } from "@/lib/types";

interface AdminPanelProps {
  users: Profile[];
  teams: TrapTeam[];
  roleDescriptions: RoleDescription[];
  disabledRoleIds: VolunteerRole[];
  applications: VolunteerApplication[];
  branding: PlatformBranding;
  currentUserId: string;
}

export function AdminPanel({
  users,
  teams,
  roleDescriptions,
  disabledRoleIds,
  applications,
  branding,
  currentUserId,
}: AdminPanelProps) {
  return (
    <Tabs defaultValue="users">
      <TabsList>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="teams">Trap Teams</TabsTrigger>
        <TabsTrigger value="roles">Volunteer Roles</TabsTrigger>
        <TabsTrigger value="branding">Branding</TabsTrigger>
        <TabsTrigger value="imports">Data Import</TabsTrigger>
      </TabsList>

      <TabsContent value="users" className="mt-4">
        <AdminUsersManager
          users={users}
          teams={teams}
          roleDescriptions={roleDescriptions}
          applications={applications}
          currentUserId={currentUserId}
        />
      </TabsContent>

      <TabsContent value="teams" className="mt-4">
        <TrapTeamsManager teams={teams} users={users} applications={applications} />
      </TabsContent>

      <TabsContent value="roles" className="mt-4">
        <RoleDescriptionsManager
          roleDescriptions={roleDescriptions}
          disabledRoleIds={disabledRoleIds}
        />
      </TabsContent>

      <TabsContent value="branding" className="mt-4">
        <BrandingSettings branding={branding} />
      </TabsContent>

      <TabsContent value="imports" className="mt-4 space-y-4">
        <VolunteerImporter
          roleDescriptions={roleDescriptions}
          disabledRoleIds={disabledRoleIds}
        />
      </TabsContent>
    </Tabs>
  );
}
