"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VOLUNTEER_ROLES } from "@/lib/constants";
import type {
  VolunteerImportDuplicateAction,
  VolunteerImportDuplicateGroup,
  VolunteerImportPreview,
} from "@/lib/volunteers/import-duplicate";
import { Loader2 } from "lucide-react";

const ACTION_OPTIONS: Array<{
  value: VolunteerImportDuplicateAction;
  label: string;
  description: string;
}> = [
  {
    value: "skip",
    label: "Keep current",
    description: "Do not import these rows.",
  },
  {
    value: "replace",
    label: "Use import",
    description: "Replace the current record with the CSV row(s).",
  },
  {
    value: "merge_import",
    label: "Merge (favor import)",
    description: "Combine roles and fields, preferring CSV values when they differ.",
  },
  {
    value: "merge_keep_existing",
    label: "Keep both (favor current)",
    description: "Combine roles and fields, keeping the current record when they differ.",
  },
];

function roleLabels(roles: string[]) {
  return roles
    .map((role) => VOLUNTEER_ROLES.find((entry) => entry.value === role)?.label ?? role)
    .join(", ");
}

function summarizeRecord(record: {
  full_name: string;
  phone: string;
  status: string;
  roles_requested: string[];
}) {
  return `${record.full_name} · ${record.phone} · ${record.status} · ${roleLabels(record.roles_requested)}`;
}

interface VolunteerImportDuplicateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: VolunteerImportPreview | null;
  readyCount: number;
  errorCount: number;
  importing: boolean;
  onConfirm: (resolutions: Record<string, VolunteerImportDuplicateAction>) => void;
}

export function VolunteerImportDuplicateDialog({
  open,
  onOpenChange,
  preview,
  readyCount,
  errorCount,
  importing,
  onConfirm,
}: VolunteerImportDuplicateDialogProps) {
  const [resolutions, setResolutions] = useState<Record<string, VolunteerImportDuplicateAction>>(
    {}
  );

  useEffect(() => {
    if (!preview) return;
    const defaults: Record<string, VolunteerImportDuplicateAction> = {};
    for (const group of preview.duplicateGroups) {
      defaults[group.email] = group.suggestedAction;
    }
    setResolutions(defaults);
  }, [preview]);

  const duplicateCount = preview?.duplicateGroups.length ?? 0;

  const summary = useMemo(() => {
    if (!preview) return null;
    return {
      ready: readyCount,
      duplicates: duplicateCount,
      invalid: errorCount,
    };
  }, [preview, readyCount, duplicateCount, errorCount]);

  function setAction(email: string, action: VolunteerImportDuplicateAction) {
    setResolutions((current) => ({ ...current, [email]: action }));
  }

  function duplicateLabel(group: VolunteerImportDuplicateGroup) {
    if (group.kind === "both") return "Matches an existing application and repeats in the CSV";
    if (group.kind === "database") return "Matches an existing application";
    return "Repeated in the CSV";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Resolve duplicate volunteers</DialogTitle>
          <DialogDescription>
            {summary
              ? `${summary.ready} row(s) are ready to import as-is, ${summary.duplicates} email(s) need a decision${
                  summary.invalid > 0 ? `, and ${summary.invalid} row(s) have validation errors` : ""
                }.`
              : "Review duplicate emails before importing."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {preview?.duplicateGroups.map((group) => (
            <div key={group.email} className="rounded-lg border p-4 space-y-3">
              <div>
                <p className="font-medium">{group.email}</p>
                <p className="text-sm text-muted-foreground">{duplicateLabel(group)}</p>
              </div>

              {group.existing && (
                <div className="text-sm">
                  <p className="font-medium text-muted-foreground">Current application</p>
                  <p>{summarizeRecord(group.existing)}</p>
                </div>
              )}

              {group.importRows.length > 0 && (
                <div className="text-sm space-y-1">
                  <p className="font-medium text-muted-foreground">
                    CSV row{group.importRows.length > 1 ? "s" : ""}
                  </p>
                  {group.importRows.map((entry) => (
                    <p key={entry.row}>
                      Row {entry.row}: {summarizeRecord(entry.record)}
                    </p>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor={`resolution-${group.email}`}>Resolution</Label>
                <Select
                  value={resolutions[group.email] ?? group.suggestedAction}
                  onValueChange={(value) =>
                    setAction(group.email, value as VolunteerImportDuplicateAction)
                  }
                >
                  <SelectTrigger id={`resolution-${group.email}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {
                    ACTION_OPTIONS.find(
                      (option) =>
                        option.value === (resolutions[group.email] ?? group.suggestedAction)
                    )?.description
                  }
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(resolutions)} disabled={importing || !preview}>
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              "Import with resolutions"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
