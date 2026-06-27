import Link from "next/link";
import { AlertTriangle, MapPin, Cat } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_COLORS } from "@/lib/constants";
import { hasActiveMedicalFlag } from "@/lib/medical-flags";
import type { HelpRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CaseCardProps {
  helpRequest: HelpRequest;
  claim?: {
    canClaim: boolean;
    onClaim: () => void;
    onUnclaim: () => void;
    userEmail: string;
    isAdmin?: boolean;
  };
}

export function CaseCard({ helpRequest: hr, claim }: CaseCardProps) {
  const medical = hasActiveMedicalFlag(
    hr.medical_flags ?? [],
    hr.medical_flag_dismissed,
    hr.medical_flag_forced
  );
  const totalCats = hr.kittens_under_8_weeks + hr.cats_over_8_weeks;
  const isUnclaimed = !hr.claimed_by_email;
  const isMine = claim ? hr.claimed_by_email === claim.userEmail : false;
  const canUnclaim =
    claim && hr.claimed_by_email && (isMine || claim.isAdmin);
  const showClaimButton = claim?.canClaim && isUnclaimed;
  const showAssignedToOther = claim && hr.claimed_by_email && !isMine && !canUnclaim;

  return (
    <Card className="flex flex-col overflow-hidden">
      <Link href={`/case/${hr.id}`} className="block flex-1 transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold">{hr.case_number}</CardTitle>
            <div className="flex items-center gap-1">
              {medical && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Medical
                </Badge>
              )}
              <Badge className={cn("text-xs", STATUS_COLORS[hr.status])}>
                {hr.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-medium">{hr.contact_name}</p>
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>
              {hr.colony_city}, {hr.colony_county} {hr.colony_zip}
            </span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Cat className="h-3.5 w-3.5 shrink-0" />
            <span>
              {totalCats} cat{totalCats !== 1 ? "s" : ""} ({hr.kittens_under_8_weeks} kittens,{" "}
              {hr.cats_over_8_weeks} adults)
            </span>
          </div>
          {hr.claimed_by_name && (
            <p className="text-xs text-muted-foreground">Working: {hr.claimed_by_name}</p>
          )}
          {hr.assigned_team_name && (
            <p className="text-xs text-muted-foreground">Team: {hr.assigned_team_name}</p>
          )}
          {hr.follow_up_due_date && new Date(hr.follow_up_due_date) < new Date() && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              Follow-up overdue
            </Badge>
          )}
        </CardContent>
      </Link>

      {(showClaimButton || canUnclaim || showAssignedToOther) && (
        <CardFooter className="flex-col items-stretch gap-2 border-t bg-muted/30 px-4 py-3">
          {showClaimButton && (
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={(event) => {
                event.preventDefault();
                claim.onClaim();
              }}
            >
              Claim case
            </Button>
          )}
          {canUnclaim && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={(event) => {
                event.preventDefault();
                claim.onUnclaim();
              }}
            >
              {isMine ? "Unclaim" : "Release claim"}
            </Button>
          )}
          {showAssignedToOther && (
            <p className="text-xs text-muted-foreground text-center">
              Assigned to {hr.claimed_by_name ?? hr.claimed_by_email}
            </p>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
