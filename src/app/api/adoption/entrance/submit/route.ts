import { NextRequest, NextResponse } from "next/server";
import { sanitizeEntranceAnswers, submissionDateStamp } from "@/lib/adoption/entrance";
import { createServiceClient } from "@/lib/supabase/server";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";

export async function POST(request: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json(
      { error: "Applications are temporarily unavailable." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const rawAnswers =
    body && typeof body === "object" && "answers" in body
      ? (body as { answers: unknown }).answers
      : body;
  const parsed = sanitizeEntranceAnswers(rawAnswers, { includeStaff: false });
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  parsed.answers.date_referred = submissionDateStamp();

  const service = await createServiceClient();
  const { error } = await service.from("adoption_entrance_applications").insert({
    cat_name: parsed.answers.cat_name,
    answers: parsed.answers,
    status: "pending",
  });

  if (error) {
    return NextResponse.json({ error: "Unable to submit this application." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
