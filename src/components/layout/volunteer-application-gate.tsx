"use client";

import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VolunteerSignupWizard } from "@/components/volunteers/volunteer-signup-wizard";
import type { Profile, RoleDescription } from "@/lib/types";

interface VolunteerApplicationGateProps {
  profile: Profile;
  signupRoleCatalog: RoleDescription[];
}

export function VolunteerApplicationGate({
  profile,
  signupRoleCatalog,
}: VolunteerApplicationGateProps) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-background/95 p-4">
      <div className="mx-auto max-w-2xl py-6 space-y-4">
        <Card>
          <CardHeader className="text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-primary mb-2" />
            <CardTitle>Complete your volunteer application</CardTitle>
            <CardDescription>
              We don&apos;t have an application on file for your account yet. Please complete the
              steps below — including any waivers or uploads required for your roles — before using
              the volunteer portal.
            </CardDescription>
          </CardHeader>
        </Card>

        <VolunteerSignupWizard
          variant="gate"
          profile={profile}
          signupRoleCatalog={signupRoleCatalog}
          onSubmitted={() => router.refresh()}
        />
      </div>
    </div>
  );
}
