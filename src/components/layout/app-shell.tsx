import { getSessionProfiles } from "@/lib/auth";
import { rolePreviewLabel } from "@/lib/admin/role-preview";
import { Sidebar } from "@/components/layout/sidebar";
import { AdminRolePreviewBanner } from "@/components/admin/admin-role-preview";
import { VolunteerGate } from "@/components/layout/volunteer-gate";
import { VolunteerApplicationGate } from "@/components/layout/volunteer-application-gate";
import { VolunteerRequirementsGate } from "@/components/layout/volunteer-requirements-gate";
import { SupabaseConfigGate } from "@/components/layout/supabase-config-gate";
import { BirthdayGate } from "@/components/layout/birthday-gate";
import { isKnownUserRole } from "@/lib/constants";
import { hasSupabaseServerConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { resolveVolunteerRoleCatalog } from "@/lib/volunteers/role-catalog";
import {
  isApplicationPendingReview,
  requiresVolunteerApplication,
  requiresVolunteerRequirementCompletion,
} from "@/lib/volunteers/application-requirements";
import type { RoleDescription, VolunteerApplication } from "@/lib/types";

export async function AppShell({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseServerConfig()) {
    return <SupabaseConfigGate />;
  }

  const { actualProfile: profile, effectiveProfile, previewKey } = await getSessionProfiles();
  const isActualAdmin = profile?.role === "admin";

  let roleDescriptions: RoleDescription[] = [];
  if (isActualAdmin) {
    const supabase = await createClient();
    const { data } = await supabase.from("role_descriptions").select("*").order("label");
    roleDescriptions = resolveVolunteerRoleCatalog((data as RoleDescription[] | null) ?? []);
  }

  const previewLabel = previewKey ? rolePreviewLabel(previewKey, roleDescriptions) : null;

  let application: VolunteerApplication | null = null;
  if (!isActualAdmin && profile?.email) {
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

  if (!isActualAdmin && effectiveProfile && requiresVolunteerApplication(effectiveProfile, application)) {
    return <VolunteerApplicationGate profile={effectiveProfile} />;
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

  return (
    <div className="min-h-screen bg-background">
      {previewKey && previewLabel && (
        <AdminRolePreviewBanner previewKey={previewKey} previewLabel={previewLabel} />
      )}
      {needsBirthday && (
        <BirthdayGate userName={effectiveProfile.full_name ?? effectiveProfile.email} />
      )}
      <Sidebar
        profile={effectiveProfile}
        isAdmin={isActualAdmin}
        previewKey={previewKey}
        roleDescriptions={roleDescriptions}
        userName={effectiveProfile.full_name ?? effectiveProfile.email}
      />
      <main className="lg:pl-64">
        <div className="container mx-auto p-4 lg:p-8 pt-16 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
