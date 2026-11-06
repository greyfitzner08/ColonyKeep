"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminUsersManager } from "@/components/admin/admin-users-manager";
import { BrandingSettings } from "@/components/admin/branding-settings";
import { InquiryFormCustomFieldsEditor } from "@/components/admin/inquiry-form-custom-fields-editor";
import { VolunteerSignupStepsEditor } from "@/components/admin/volunteer-signup-steps-editor";
import { RoleDescriptionsManager } from "@/components/admin/role-descriptions-manager";
import { TrapTeamsManager } from "@/components/admin/trap-teams-manager";
import { PageHeader } from "@/components/layout/page-header";
import { VolunteerImporter } from "@/components/volunteers/volunteer-importer";
import { VolunteersAdminMenu } from "@/components/volunteers/volunteers-admin-menu";
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
  const [tab, setTab] = useState("users");

  const allUserContacts = useMemo(() => {
    const seen = new Set<string>();
    const contacts: { name: string; email: string; phone: string }[] = [];
    for (const user of users) {
      const email = user.email.trim();
      if (!email) continue;
      const key = email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      contacts.push({
        name: user.full_name?.trim() || email,
        email,
        phone: user.phone?.trim() || "",
      });
    }
    return contacts;
  }, [users]);

  const tnvrContacts = useMemo(
    () =>
      allUserContacts.filter((contact) => {
        const profile = users.find(
          (user) => user.email.trim().toLowerCase() === contact.email.toLowerCase()
        );
        return profile?.role === "trap_team_lead";
      }),
    [allUserContacts, users]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Settings"
        description="Manage users, teams, branding, and role descriptions"
        actions={
          tab === "users" ? (
            <VolunteersAdminMenu
              contacts={tnvrContacts.length > 0 ? tnvrContacts : allUserContacts}
              shownCount={tnvrContacts.length > 0 ? tnvrContacts.length : users.length}
              title="User admin tools"
              ariaLabel="User admin tools"
              description={
                tnvrContacts.length > 0
                  ? `Copy contact details for TNVR Team users (${tnvrContacts.length} unique email${
                      tnvrContacts.length === 1 ? "" : "s"
                    }).`
                  : `Copy contact details for users (${allUserContacts.length} unique email${
                      allUserContacts.length === 1 ? "" : "s"
                    }).`
              }
            />
          ) : null
        }
      />

    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="teams">Trap Teams</TabsTrigger>
        <TabsTrigger value="roles">Volunteer Roles</TabsTrigger>
        <TabsTrigger value="branding">Branding</TabsTrigger>
        <TabsTrigger value="colony-intro">Inquiry Form Custom Fields</TabsTrigger>
        <TabsTrigger value="volunteer-signup">Volunteer Application Steps</TabsTrigger>
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

      <TabsContent value="colony-intro" className="mt-4">
        <InquiryFormCustomFieldsEditor branding={branding} />
      </TabsContent>

      <TabsContent value="volunteer-signup" className="mt-4">
        <VolunteerSignupStepsEditor
          branding={branding}
          roles={roleDescriptions.filter((role) => !disabledRoleIds.includes(role.role_id))}
        />
      </TabsContent>

      <TabsContent value="imports" className="mt-4 space-y-4">
        <VolunteerImporter
          roleDescriptions={roleDescriptions}
          disabledRoleIds={disabledRoleIds}
        />
      </TabsContent>
    </Tabs>
    </div>
  );
}
