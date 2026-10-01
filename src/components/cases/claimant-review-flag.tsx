import { Badge } from "@/components/ui/badge";
import type { HelpRequest } from "@/lib/types";

export function ClaimantReviewFlag({
  helpRequest,
}: {
  helpRequest: Pick<HelpRequest, "claimant_needs_review" | "claimed_by_name">;
}) {
  if (!helpRequest.claimant_needs_review) return null;

  const who = helpRequest.claimed_by_name?.trim();
  return (
    <Badge
      variant="outline"
      className="whitespace-nowrap border-amber-300 bg-amber-50 text-[10px] text-amber-950"
      title={who ? `${who} is not a user yet` : "Claimed by someone who is not a user yet"}
    >
      Missing user
    </Badge>
  );
}
