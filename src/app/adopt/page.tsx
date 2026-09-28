import { createServiceClient } from "@/lib/supabase/server";
import { AdoptionApplicationForm } from "@/components/adoption/adoption-application-form";

export default async function AdoptPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const params = await searchParams;
  let initialCatInterestName = "";
  let initialCatId = "";

  if (params.cat?.trim()) {
    const service = await createServiceClient();
    const { data } = await service
      .from("adoptable_cats")
      .select("id, name")
      .eq("id", params.cat.trim())
      .maybeSingle();
    initialCatInterestName = data?.name?.trim() ?? "";
    initialCatId = initialCatInterestName && data?.id ? data.id : "";
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <AdoptionApplicationForm
        initialCatInterestName={initialCatInterestName}
        initialCatId={initialCatId}
      />
    </main>
  );
}
