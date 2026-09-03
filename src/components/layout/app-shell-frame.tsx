"use client";

import { AdminRolePreviewBanner } from "@/components/admin/admin-role-preview";
import { Sidebar } from "@/components/layout/sidebar";
import { BirthdayGate } from "@/components/layout/birthday-gate";
import { PlatformTutorialGate } from "@/components/platform-tutorial/platform-tutorial-gate";
import { PlatformTutorialNavigationProvider } from "@/components/platform-tutorial/tutorial-navigation-context";
import { cn } from "@/lib/utils";
import type { Profile, RoleDescription } from "@/lib/types";
import type { TeamFeedActivity } from "@/lib/team-feed/activity";

interface AppShellFrameProps {
  children: React.ReactNode;
  effectiveProfile: Profile;
  previewKey: string | null;
  previewLabel: string | null;
  isActualAdmin: boolean;
  roleDescriptions: RoleDescription[];
  needsBirthday: boolean;
  showPlatformTutorial: boolean;
  teamFeedActivity: TeamFeedActivity | null;
}

export function AppShellFrame({
  children,
  effectiveProfile,
  previewKey,
  previewLabel,
  isActualAdmin,
  roleDescriptions,
  needsBirthday,
  showPlatformTutorial,
  teamFeedActivity,
}: AppShellFrameProps) {
  const previewActive = Boolean(previewKey && previewLabel);

  return (
    <PlatformTutorialNavigationProvider>
      <div className="min-h-screen bg-background">
        {previewActive && (
          <AdminRolePreviewBanner previewKey={previewKey} previewLabel={previewLabel} />
        )}
        {needsBirthday && (
          <BirthdayGate userName={effectiveProfile.full_name ?? effectiveProfile.email} />
        )}
        {showPlatformTutorial && (
          <PlatformTutorialGate
            profile={effectiveProfile}
            userName={effectiveProfile.full_name ?? effectiveProfile.email}
          />
        )}
        <Sidebar
          profile={effectiveProfile}
          isAdmin={isActualAdmin}
          previewKey={previewKey}
          roleDescriptions={roleDescriptions}
          userName={effectiveProfile.full_name ?? effectiveProfile.email}
          teamFeedActivity={teamFeedActivity}
        />
        <main
          className={cn(
            "lg:pl-64",
            previewActive ? "pt-[7.5rem] lg:pt-14" : "pt-14 lg:pt-8"
          )}
        >
          <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-[100vw] overflow-x-hidden">{children}</div>
        </main>
      </div>
    </PlatformTutorialNavigationProvider>
  );
}
