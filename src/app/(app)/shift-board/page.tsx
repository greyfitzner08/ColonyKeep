import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { ShiftBoard } from "@/components/shifts/shift-board";
import type { Shift } from "@/lib/types";

export default async function ShiftBoardPage() {
  const supabase = await createClient();
  const profile = await getAppProfile();

  const { data: shifts } = await supabase
    .from("shifts")
    .select("*")
    .gte("date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
    .order("date");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Shift Board</h1>
        <p className="text-muted-foreground">Sign up for volunteer shifts</p>
      </div>
      <ShiftBoard
        shifts={(shifts ?? []) as Shift[]}
        userEmail={profile?.email ?? ""}
        isAdmin={profile?.role === "admin"}
      />
    </div>
  );
}
