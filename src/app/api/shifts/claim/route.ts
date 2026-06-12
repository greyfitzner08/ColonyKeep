import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendShiftConfirmationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { shiftId, action } = await request.json();
  const email = user.email!;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile?.role) {
    return NextResponse.json({ error: "Not approved" }, { status: 403 });
  }

  const { data: shift } = await supabase.from("shifts").select("*").eq("id", shiftId).single();
  if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

  let signedUp = [...(shift.signed_up_emails ?? [])];

  if (action === "claim") {
    if (signedUp.length >= shift.volunteers_needed) {
      return NextResponse.json({ error: "Shift is full" }, { status: 400 });
    }
    if (!signedUp.includes(email)) {
      signedUp.push(email);
    }
  } else if (action === "unclaim") {
    signedUp = signedUp.filter((e) => e !== email);
  }

  const { error } = await supabase
    .from("shifts")
    .update({ signed_up_emails: signedUp })
    .eq("id", shiftId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (action === "claim") {
    await sendShiftConfirmationEmail(email, profile.full_name ?? email, {
      event_name: shift.event_name,
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      location: shift.location,
    });
  }

  return NextResponse.json({ success: true, signed_up_emails: signedUp });
}
