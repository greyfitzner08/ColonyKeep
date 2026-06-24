import Link from "next/link";
import { AlertTriangle, Cat, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_COLORS } from "@/lib/constants";
import { hasActiveMedicalFlag } from "@/lib/medical-flags";
import type { TrapTeamUnclaimedCase } from "@/lib/dashboard/trap-team-data";
import { cn, formatDate } from "@/lib/utils";

interface UnclaimedTeamAssignmentsProps {
  cases: TrapTeamUnclaimedCase[];
}

function catSummary(c: TrapTeamUnclaimedCase) {
  const total = c.kittens_under_8_weeks + c.cats_over_8_weeks;
  if (total === 0) return "Cat count not recorded";
  return `${total} cat${total !== 1 ? "s" : ""} (${c.kittens_under_8_weeks} kitten${c.kittens_under_8_weeks !== 1 ? "s" : ""}, ${c.cats_over_8_weeks} adult${c.cats_over_8_weeks !== 1 ? "s" : ""})`;
}

export function UnclaimedTeamAssignments({ cases }: UnclaimedTeamAssignmentsProps) {
  if (cases.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-amber-950">
            Unclaimed team assignments ({cases.length})
          </p>
          <p className="text-xs text-muted-foreground">
            Routed to your team but not yet claimed by a member.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="bg-white">
          <Link href="/trap-queue">Open trap queue</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {cases.map((c) => {
          const medical = hasActiveMedicalFlag(
            c.medical_flags ?? [],
            c.medical_flag_dismissed,
            c.medical_flag_forced
          );
          const location = [c.colony_city, c.colony_county, c.colony_zip].filter(Boolean).join(", ");
          const followUpOverdue =
            c.follow_up_due_date && new Date(c.follow_up_due_date) < new Date();

          return (
            <Link
              key={c.id}
              href={`/case/${c.id}`}
              className="block rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm">{c.case_number}</p>
                <div className="flex flex-wrap justify-end gap-1">
                  {medical && (
                    <Badge variant="destructive" className="gap-1 text-xs">
                      <AlertTriangle className="h-3 w-3" />
                      Medical
                    </Badge>
                  )}
                  <Badge className={cn("text-xs", STATUS_COLORS[c.status])}>
                    {c.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>

              {c.contact_name && (
                <p className="text-sm mt-2 font-medium">{c.contact_name}</p>
              )}

              <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {location && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{location}</span>
                  </div>
                )}
                <div className="flex items-start gap-1.5">
                  <Cat className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{catSummary(c)}</span>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {followUpOverdue && (
                  <Badge variant="outline" className="text-xs text-orange-700 border-orange-300">
                    Follow-up overdue
                  </Badge>
                )}
                {c.updated_at && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    Updated {formatDate(c.updated_at)}
                  </Badge>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
