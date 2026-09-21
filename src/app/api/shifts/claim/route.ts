import { NextRequest, NextResponse } from "next/server";
import { requireShiftAccess } from "@/lib/api/auth";
import { isAppointmentDatePast } from "@/lib/appointments/slot-date";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  isAttendanceShift,
  shiftSignupBlockedReason,
  type ShiftEligibilityProfile,
} from "@/lib/shifts/eligibility";
import type { ShiftRequiredRole, UserRole, VolunteerRole } from "@/lib/types";

type ClaimAction =
  | "claim"
  | "unclaim"
  | "remove"
  | "waitlist"
  | "leave_waitlist"
  | "remove_waitlist"
  | "decline"
  | "leave_decline"
  | "remove_decline";

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

function removeEmail(list: string[], emailLower: string) {
  return list.filter((entry) => entry.toLowerCase() !== emailLower);
}

function includesEmail(list: string[], emailLower: string) {
  return list.some((entry) => entry.toLowerCase() === emailLower);
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

  const attendance = isAttendanceShift(shift);
  const eligibilityProfile: ShiftEligibilityProfile = {
    role: (profile?.role ?? null) as UserRole | null,
    volunteer_roles: (profile?.volunteer_roles ?? []) as VolunteerRole[],
    tnvr_certificate_uploaded: Boolean(profile?.tnvr_certificate_uploaded),
  };

  let signedUp = [...(shift.signed_up_emails ?? [])];
  let waitlist = [...(shift.waitlist_emails ?? [])];
  let declined = [...(shift.declined_emails ?? [])];

  const selfActionsNeedingEligibility = new Set(["claim", "waitlist", "decline"]);
  if (action && selfActionsNeedingEligibility.has(action)) {
    const blocked = shiftSignupBlockedReason(
      eligibilityProfile,
      (shift.required_roles ?? "any") as ShiftRequiredRole
    );
    if (blocked) {
      return NextResponse.json({ error: blocked }, { status: 403 });
    }
  }

  if (action === "claim") {
    if (isAppointmentDatePast(shift.date)) {
      return NextResponse.json(
        { error: "Cannot sign up for a shift on a past date" },
        { status: 400 }
      );
    }
    if (!attendance && signedUp.length >= shift.volunteers_needed) {
      return NextResponse.json({ error: "Shift is full" }, { status: 400 });
    }
    if (!includesEmail(signedUp, emailLower)) {
      signedUp.push(email);
    }
    waitlist = removeEmail(waitlist, emailLower);
    declined = removeEmail(declined, emailLower);
  } else if (action === "unclaim") {
    signedUp = removeEmail(signedUp, emailLower);
    if (!attendance) {
      promoteFromWaitlist(signedUp, waitlist, shift.volunteers_needed);
    }
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
    signedUp = removeEmail(signedUp, targetEmail);
    if (!attendance) {
      promoteFromWaitlist(signedUp, waitlist, shift.volunteers_needed);
    }
  } else if (action === "waitlist") {
    if (attendance) {
      return NextResponse.json(
        { error: "Attendance shifts do not use a waitlist — mark attending instead." },
        { status: 400 }
      );
    }
    if (isAppointmentDatePast(shift.date)) {
      return NextResponse.json(
        { error: "Cannot join the waitlist for a past date" },
        { status: 400 }
      );
    }
    if (includesEmail(signedUp, emailLower)) {
      return NextResponse.json({ error: "Already signed up for this shift" }, { status: 400 });
    }
    if (signedUp.length < shift.volunteers_needed) {
      return NextResponse.json(
        { error: "Spots are still open — sign up instead of waitlisting" },
        { status: 400 }
      );
    }
    if (!includesEmail(waitlist, emailLower)) {
      waitlist.push(email);
    }
  } else if (action === "leave_waitlist") {
    waitlist = removeEmail(waitlist, emailLower);
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
    waitlist = removeEmail(waitlist, targetEmail);
  } else if (action === "decline") {
    if (!attendance) {
      return NextResponse.json(
        { error: "Only attendance shifts support “can’t make it” responses." },
        { status: 400 }
      );
    }
    if (isAppointmentDatePast(shift.date)) {
      return NextResponse.json(
        { error: "Cannot update RSVP for a past date" },
        { status: 400 }
      );
    }
    signedUp = removeEmail(signedUp, emailLower);
    waitlist = removeEmail(waitlist, emailLower);
    if (!includesEmail(declined, emailLower)) {
      declined.push(email);
    }
  } else if (action === "leave_decline") {
    declined = removeEmail(declined, emailLower);
  } else if (action === "remove_decline") {
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const targetEmail = String(body.email ?? "")
      .trim()
      .toLowerCase();
    if (!targetEmail) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }
    declined = removeEmail(declined, targetEmail);
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { error } = await service
    .from("shifts")
    .update({
      signed_up_emails: signedUp,
      waitlist_emails: waitlist,
      declined_emails: declined,
    })
    .eq("id", shiftId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    success: true,
    signed_up_emails: signedUp,
    waitlist_emails: waitlist,
    declined_emails: declined,
  });
}
