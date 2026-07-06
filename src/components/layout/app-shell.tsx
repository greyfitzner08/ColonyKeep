import { getSessionProfiles } from "@/lib/auth";
import { rolePreviewLabel } from "@/lib/admin/role-preview";
import { VolunteerGate } from "@/components/layout/volunteer-gate";
import { VolunteerApplicationGate } from "@/components/layout/volunteer-application-gate";
import { VolunteerRequirementsGate } from "@/components/layout/volunteer-requirements-gate";
import { SupabaseConfigGate } from "@/components/layout/supabase-config-gate";
import { AppShellFrame } from "@/components/layout/app-shell-frame";
import { isKnownUserRole } from "@/lib/constants";
import { hasSupabaseServerConfig } from "@/lib/supabase/env";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { fetchVolunteerRoleCatalogInputs } from "@/lib/volunteers/load-role-catalog";
import {
  isApplicationPendingReview,
  requiresVolunteerApplication,
  requiresVolunteerRequirementCompletion,
} from "@/lib/volunteers/application-requirements";
import { fetchTeamFeedActivity, type TeamFeedActivity } from "@/lib/team-feed/activity";
import type { RoleDescription, VolunteerApplication } from "@/lib/types";

export async function AppShell({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseServerConfig()) {
    return <SupabaseConfigGate />;
  }

  const { actualProfile: profile, effectiveProfile, previewKey } = await getSessionProfiles();
  const isActualAdmin = profile?.role === "admin";

  let roleDescriptions: RoleDescription[] = [];
  let signupRoleCatalog: RoleDescription[] = [];
  const supabase = await createClient();

  if (isActualAdmin) {
    const { catalog, signupCatalog } = await fetchVolunteerRoleCatalogInputs(supabase);
    roleDescriptions = catalog;
    signupRoleCatalog = signupCatalog;
  }

  const previewLabel = previewKey ? rolePreviewLabel(previewKey, roleDescriptions) : null;

  let application: VolunteerApplication | null = null;
  if (!isActualAdmin && profile?.email) {
    const { data } = await supabase
      .from("volunteer_applications")
      .select("*")
      .eq("email", profile.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    application = (data as VolunteerApplication | null) ?? null;
  }

  if (!isActualAdmin && effectiveProfile && requiresVolunteerApplication(effectiveProfile, application)) {
    if (signupRoleCatalog.length === 0) {
      const { signupCatalog } = await fetchVolunteerRoleCatalogInputs(supabase);
      signupRoleCatalog = signupCatalog;
    }
    return (
      <VolunteerApplicationGate
        profile={effectiveProfile}
        signupRoleCatalog={signupRoleCatalog}
      />
    );
  }

  if (!isActualAdmin && effectiveProfile && isApplicationPendingReview(effectiveProfile, application)) {
    return <VolunteerGate />;
  }

  if (
    !isActualAdmin &&
    effectiveProfile &&
    application &&
    requiresVolunteerRequirementCompletion(effectiveProfile, application)
  ) {
    return <VolunteerRequirementsGate profile={effectiveProfile} application={application} />;
  }

  if (!isKnownUserRole(effectiveProfile?.role)) {
    return <VolunteerGate />;
  }

  const needsBirthday =
    effectiveProfile != null &&
    Object.prototype.hasOwnProperty.call(effectiveProfile, "birthday") &&
    !effectiveProfile.birthday;

  const showPlatformTutorial =
    profile != null &&
    !profile.platform_tutorial_completed_at &&
    !needsBirthday &&
    !previewKey;

  let teamFeedActivity: TeamFeedActivity | null = null;
  if (effectiveProfile) {
    try {
      const supabase = await createClient();
      const service = await createServiceClient();
      teamFeedActivity = await fetchTeamFeedActivity(supabase, service, effectiveProfile);
    } catch {
      teamFeedActivity = null;
    }
  }

  return (
    <AppShellFrame
      effectiveProfile={effectiveProfile}
      previewKey={previewKey}
      previewLabel={previewLabel}
      isActualAdmin={isActualAdmin}
      roleDescriptions={roleDescriptions}
      needsBirthday={needsBirthday}
      showPlatformTutorial={showPlatformTutorial}
      teamFeedActivity={teamFeedActivity}
    >
      {children}
    </AppShellFrame>
  );
}
