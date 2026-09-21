import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { getPlatformBranding } from "@/lib/branding-server";
import { PageHeader } from "@/components/layout/page-header";
import { ShiftBoard } from "@/components/shifts/shift-board";
import { GoogleCalendarEmbed } from "@/components/shifts/google-calendar-embed";
import type { Shift } from "@/lib/types";

export default async function ShiftBoardPage() {
  const supabase = await createClient();
  const profile = await getAppProfile();
  const isAdmin = profile?.role === "admin";
  const branding = await getPlatformBranding();

  const { data: shifts } = await supabase
    .from("shifts")
    .select("*")
    .gte("date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
    .order("date");

  const typedShifts = (shifts ?? []) as Shift[];
  const rosterEmails = Array.from(
    new Set(
      typedShifts.flatMap((shift) =>
        [...(shift.signed_up_emails ?? []), ...(shift.waitlist_emails ?? [])]
          .map((email) => email.trim())
          .filter(Boolean)
      )
    )
  );

  const signupNamesByEmail: Record<string, string> = {};
  if (isAdmin && rosterEmails.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("email, full_name")
      .in("email", rosterEmails);

    for (const row of profiles ?? []) {
      const email = row.email?.trim().toLowerCase();
      if (!email) continue;
      signupNamesByEmail[email] = row.full_name?.trim() || row.email;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shift Board"
        description="Open an event to sign up. If a slot is full, join the waitlist."
      />
      {branding.google_calendar_embed_url && (
        <GoogleCalendarEmbed embedUrl={branding.google_calendar_embed_url} />
      )}
      <ShiftBoard
        shifts={typedShifts}
        userEmail={profile?.email ?? ""}
        isAdmin={isAdmin}
        signupNamesByEmail={signupNamesByEmail}
      />
    </div>
  );
}
