import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { documentVisibleToProfile } from "@/lib/permissions";
import { LibraryManager } from "@/components/resources/library-manager";
import type { LibraryDocument } from "@/lib/types";

export default async function ResourcesPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data: documents } = await supabase
    .from("library_documents")
    .select("*")
    .order("section")
    .order("title");

  const visibleDocuments = ((documents ?? []) as LibraryDocument[]).filter((doc) =>
    doc.is_active !== false && documentVisibleToProfile(doc.view_roles, profile)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Resources</h1>
        <p className="text-muted-foreground">
          Handbook, SOPs, and other reference documents for your team
        </p>
      </div>
      <LibraryManager
        documents={visibleDocuments}
        isAdmin={profile?.role === "admin"}
      />
    </div>
  );
}
