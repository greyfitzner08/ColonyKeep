import { createServiceClient } from "@/lib/supabase/server";
import { AdoptionApplicationForm } from "@/components/adoption/adoption-application-form";
import type { AdoptableCat } from "@/lib/adoption/constants";

export default async function AdoptPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const params = await searchParams;
  const service = await createServiceClient();
  const { data } = await service
    .from("adoptable_cats")
    .select("id, name, age_description, profile_photo_url, status")
    .in("status", ["available", "pending"])
    .order("name");

  const cats = (data ?? []) as Pick<
    AdoptableCat,
    "id" | "name" | "age_description" | "profile_photo_url" | "status"
  >[];

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <AdoptionApplicationForm cats={cats} initialCatId={params.cat ?? null} />
    </main>
  );
}
