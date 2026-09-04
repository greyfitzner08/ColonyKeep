import { NextRequest, NextResponse } from "next/server";
import { requireShiftAccess } from "@/lib/api/auth";
import { isAppointmentDatePast } from "@/lib/appointments/slot-date";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type ClaimAction =
  | "claim"
  | "unclaim"
  | "remove"
  | "waitlist"
  | "leave_waitlist"
  | "remove_waitlist";

function promoteFromWaitlist(
  signedUp: string[],
  waitlist: string[],
  volunteersNeeded: number
) {
  while (signedUp.length < volunteersNeeded && waitlist.length > 0) {
    const next = waitlist.shift()!;
    if (!signedUp.some((email) => email.toLowerCase() === next.toLowerCase())) {
      signedUp.push(next);
    }
  }
}

export async function POST(request: NextRequest) {
  const { profile, response } = await requireShiftAccess();
  if (response) return response;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const shiftId = body.shiftId as string | undefined;
  const action = body.action as ClaimAction | undefined;
  const email = user.email;
  const emailLower = email.toLowerCase();
  const isAdmin = profile?.role === "admin";

  // Service role after auth: volunteers can no longer UPDATE shifts directly via RLS.
  const service = await createServiceClient();
  const { data: shift } = await service.from("shifts").select("*").eq("id", shiftId).single();
  if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

  let signedUp = [...(shift.signed_up_emails ?? [])];
  let waitlist = [...(shift.waitlist_emails ?? [])];

  if (action === "claim") {
    if (isAppointmentDatePast(shift.date)) {
      return NextResponse.json(
        { error: "Cannot sign up for a shift on a past date" },
        { status: 400 }
      );
    }
    if (signedUp.length >= shift.volunteers_needed) {
      return NextResponse.json({ error: "Shift is full" }, { status: 400 });
    }
    if (!signedUp.some((e) => e.toLowerCase() === emailLower)) {
      signedUp.push(email);
    }
    waitlist = waitlist.filter((e) => e.toLowerCase() !== emailLower);
  } else if (action === "unclaim") {
    signedUp = signedUp.filter((e) => e.toLowerCase() !== emailLower);
    promoteFromWaitlist(signedUp, waitlist, shift.volunteers_needed);
  } else if (action === "remove") {
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const targetEmail = String(body.email ?? "")
      .trim()
      .toLowerCase();
    if (!targetEmail) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }
    signedUp = signedUp.filter((e) => e.toLowerCase() !== targetEmail);
    promoteFromWaitlist(signedUp, waitlist, shift.volunteers_needed);
  } else if (action === "waitlist") {
    if (isAppointmentDatePast(shift.date)) {
      return NextResponse.json(
        { error: "Cannot join the waitlist for a past date" },
        { status: 400 }
      );
    }
    if (signedUp.some((e) => e.toLowerCase() === emailLower)) {
      return NextResponse.json({ error: "Already signed up for this shift" }, { status: 400 });
    }
    if (signedUp.length < shift.volunteers_needed) {
      return NextResponse.json(
        { error: "Spots are still open — sign up instead of waitlisting" },
        { status: 400 }
      );
    }
    if (!waitlist.some((e) => e.toLowerCase() === emailLower)) {
      waitlist.push(email);
    }
  } else if (action === "leave_waitlist") {
    waitlist = waitlist.filter((e) => e.toLowerCase() !== emailLower);
  } else if (action === "remove_waitlist") {
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const targetEmail = String(body.email ?? "")
      .trim()
      .toLowerCase();
    if (!targetEmail) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }
    waitlist = waitlist.filter((e) => e.toLowerCase() !== targetEmail);
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { error } = await service
    .from("shifts")
    .update({
      signed_up_emails: signedUp,
      waitlist_emails: waitlist,
    })
    .eq("id", shiftId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    success: true,
    signed_up_emails: signedUp,
    waitlist_emails: waitlist,
  });
}
