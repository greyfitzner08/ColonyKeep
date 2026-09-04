import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { ShiftBoard } from "@/components/shifts/shift-board";
import type { Shift } from "@/lib/types";

export default async function ShiftBoardPage() {
  const supabase = await createClient();
  const profile = await getAppProfile();
  const isAdmin = profile?.role === "admin";

  const { data: shifts } = await supabase
    .from("shifts")
    .select("*")
    .gte("date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
    .order("date");

  const typedShifts = (shifts ?? []) as Shift[];
  const signupEmails = Array.from(
    new Set(
      typedShifts.flatMap((shift) =>
        (shift.signed_up_emails ?? []).map((email) => email.trim()).filter(Boolean)
      )
    )
  );

  const signupNamesByEmail: Record<string, string> = {};
  if (isAdmin && signupEmails.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("email, full_name")
      .in("email", signupEmails);

    for (const row of profiles ?? []) {
      const email = row.email?.trim().toLowerCase();
      if (!email) continue;
      signupNamesByEmail[email] = row.full_name?.trim() || row.email;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Shift Board</h1>
        <p className="text-muted-foreground">
          Browse events by position and sign up for open shifts.
        </p>
      </div>
      <ShiftBoard
        shifts={typedShifts}
        userEmail={profile?.email ?? ""}
        isAdmin={isAdmin}
        signupNamesByEmail={signupNamesByEmail}
      />
    </div>
  );
}
