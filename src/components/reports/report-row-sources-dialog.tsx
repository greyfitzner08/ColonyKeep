"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReportRow } from "@/lib/reports/aggregations";

interface ReportRowSourcesDialogProps {
  row: ReportRow | null;
  onOpenChange: (open: boolean) => void;
}

export function ReportRowSourcesDialog({ row, onOpenChange }: ReportRowSourcesDialogProps) {
  const sources = row?.sources ?? [];
  const countLabel = sources.length === 1 ? "1 record" : `${sources.length} records`;

  return (
    <Dialog open={row != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row?.label ?? "Report row"}</DialogTitle>
          <DialogDescription>
            {countLabel} behind this number. Open a case to see the full record.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {sources.map((source) => (
            <li key={source.id} className="rounded-lg border px-3 py-2">
              {source.href ? (
                <Link href={source.href} className="font-medium text-primary hover:underline">
                  {source.title}
                </Link>
              ) : (
                <p className="font-medium">{source.title}</p>
              )}
              {source.detail ? (
                <p className="mt-0.5 text-sm text-muted-foreground">{source.detail}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
