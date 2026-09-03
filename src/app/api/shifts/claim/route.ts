import { NextRequest, NextResponse } from "next/server";
import { requireShiftAccess } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireShiftAccess();
  if (response) return response;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { shiftId, action } = await request.json();
  const email = user.email!;

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

  return NextResponse.json({ success: true, signed_up_emails: signedUp });
}
