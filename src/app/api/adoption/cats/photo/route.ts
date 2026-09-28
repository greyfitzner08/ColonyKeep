import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { canAccessAdoptions } from "@/lib/permissions";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole([
    "admin",
    "volunteer",
    "trap_team_lead",
  ]);
  if (response) return response;
  if (!canAccessAdoptions(profile)) {
    return NextResponse.json({ error: "Adoption access required" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const catId = formData.get("cat_id");
  if (typeof catId !== "string" || !catId.trim()) {
    return NextResponse.json({ error: "Choose a cat before uploading a photo." }, { status: 400 });
  }
  const id = catId.trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo must be 5MB or smaller" }, { status: 400 });
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG, WebP, or GIF image" },
      { status: 400 }
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-") || "photo.jpg";
  const path = `${id}/${Date.now()}-${safeName}`;

  const service = await createServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await service.storage.from("adoption-photos").upload(path, buffer, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: publicUrl } = service.storage.from("adoption-photos").getPublicUrl(path);
  const { data: saved, error: saveError } = await service
    .from("adoptable_cats")
    .update({ profile_photo_url: publicUrl.publicUrl })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (saveError || !saved) {
    return NextResponse.json({ error: "Unable to save the photo on this cat." }, { status: 400 });
  }

  return NextResponse.json({
    profile_photo_url: publicUrl.publicUrl,
  });
}
