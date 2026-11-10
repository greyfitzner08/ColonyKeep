import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { HelpRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NeedsClinicDateFlag({
  helpRequest,
  className,
}: {
  helpRequest: Pick<HelpRequest, "needs_clinic_date">;
  className?: string;
}) {
  if (!helpRequest.needs_clinic_date) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 whitespace-nowrap border-pink-300 bg-pink-50 text-pink-800 dark:border-pink-700 dark:bg-pink-950/40 dark:text-pink-100",
        className
      )}
    >
      <CalendarClock className="h-3 w-3" />
      Needs Clinic Date
    </Badge>
  );
}
