import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { intakeClaimRequiredResponse } from "@/lib/cases/intake-claim-api";
import type { HelpRequestStatus, Profile } from "@/lib/types";

/** Load claim fields and return a block response when the actor may not edit. */
export async function caseClaimBlockForId(options: {
  service: SupabaseClient;
  helpRequestId: string;
  profile: Profile;
}): Promise<NextResponse | null> {
  const { data, error } = await options.service
    .from("help_requests")
    .select("status, claimed_by_email")
    .eq("id", options.helpRequestId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  return intakeClaimRequiredResponse({
    role: options.profile.role,
    status: data.status as HelpRequestStatus,
    claimedByEmail: data.claimed_by_email,
    actorEmail: options.profile.email,
  });
}
