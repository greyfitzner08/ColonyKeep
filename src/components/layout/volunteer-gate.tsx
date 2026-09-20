"use client";

import { Cat, Clock, LogIn } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppName } from "@/components/branding/branding-provider";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { volunteerRoleLabel, resolveVolunteerRoleCatalog } from "@/lib/volunteers/role-catalog";
import type { VolunteerApplication } from "@/lib/types";

interface VolunteerGateProps {
  application?: VolunteerApplication | null;
}

function formatStatus(status: VolunteerApplication["status"]): string {
  switch (status) {
    case "pending":
      return "Pending review";
    case "needs_followup":
      return "Needs follow-up";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "inactive":
      return "Inactive";
    default:
      return status;
  }
}

export function VolunteerGate({ application = null }: VolunteerGateProps) {
  const appName = useAppName();
  const roleCatalog = resolveVolunteerRoleCatalog([]);
  const roles = application?.roles_requested ?? [];

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Application Under Review</CardTitle>
          <CardDescription>
            Thank you for applying to volunteer with {appName}. Your application is being reviewed by
            our team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            You&apos;ll receive an email once your application is approved and you&apos;ll gain
            access to the volunteer portal.
          </p>

          {application && (
            <div className="rounded-lg border bg-muted/40 p-3 text-left text-sm space-y-2">
              <p className="font-medium text-foreground">Your submitted application</p>
              <p>
                <span className="text-muted-foreground">Name:</span> {application.full_name}
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span> {application.email}
              </p>
              {application.phone && (
                <p>
                  <span className="text-muted-foreground">Phone:</span> {application.phone}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Status:</span>{" "}
                {formatStatus(application.status)}
              </p>
              {roles.length > 0 && (
                <p>
                  <span className="text-muted-foreground">Roles requested:</span>{" "}
                  {roles.map((role) => volunteerRoleLabel(role, roleCatalog)).join(", ")}
                </p>
              )}
              {application.prior_experience?.trim() && (
                <p>
                  <span className="text-muted-foreground">Experience:</span>{" "}
                  {application.prior_experience}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Sign in
              </Link>
            </Button>
            {!application && (
              <Button asChild variant="outline">
                <Link href="/volunteer-signup">View Application Form</Link>
              </Button>
            )}
            <Button asChild variant="ghost">
              <Link href="/request">
                <Cat className="mr-2 h-4 w-4" />
                Report a Cat Colony in Mecklenburg County
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
