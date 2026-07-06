"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, MapPinOff, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HotspotColonyAddressDialog } from "@/components/maps/hotspot-colony-address-dialog";
import { formatSingleLineAddress } from "@/lib/cases/colony-notes";
import { hasStoredColonyCoords } from "@/lib/cases/colony-address-fields";
import { getStatusLabel, isHotspotColonyStatus } from "@/lib/cases/statuses";
import { STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { HelpRequest } from "@/lib/types";

interface HotspotsUnmappedColoniesProps {
  helpRequests: HelpRequest[];
  canEdit: boolean;
  onHelpRequestUpdated: (updated: HelpRequest) => void;
}

function colonyAddressPreview(hr: HelpRequest) {
  return (
    formatSingleLineAddress([
      hr.colony_address,
      hr.colony_city,
      hr.colony_state,
      hr.colony_zip,
      hr.colony_county,
    ]) ?? "No address on file"
  );
}

export function HotspotsUnmappedColonies({
  helpRequests,
  canEdit,
  onHelpRequestUpdated,
}: HotspotsUnmappedColoniesProps) {
  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [editingCase, setEditingCase] = useState<HelpRequest | null>(null);

  const unmapped = useMemo(
    () =>
      helpRequests.filter(
        (hr) => isHotspotColonyStatus(hr.status) && !hasStoredColonyCoords(hr)
      ),
    [helpRequests]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return unmapped;

    return unmapped.filter((hr) => {
      const haystack = [
        hr.case_number,
        hr.colony_address,
        hr.colony_city,
        hr.colony_state,
        hr.colony_zip,
        hr.colony_county,
        getStatusLabel(hr.status),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [search, unmapped]);

  if (unmapped.length === 0) {
    return null;
  }

  return (
    <>
      <div className="rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex items-start justify-between gap-3 p-4">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-start gap-2 rounded-md text-left transition-colors hover:bg-amber-100/60 dark:hover:bg-amber-950/30"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            <ChevronDown
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300 transition-transform",
                open && "rotate-180"
              )}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MapPinOff className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
                  Unmapped colonies ({unmapped.length})
                </p>
              </div>
              {!open && (
                <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/80">
                  These cases are missing map coordinates. Expand to review and fix addresses.
                </p>
              )}
            </div>
          </button>
        </div>

        {open && (
          <div className="space-y-3 border-t border-amber-200/80 px-4 pb-4 pt-3 dark:border-amber-900/50">
            <p className="text-xs text-amber-900/80 dark:text-amber-100/80">
              Unmapped cases won&apos;t appear as pins until they have a geocoded address. Editing
              here updates the case record used in intake and trap queues.
            </p>

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search unmapped colonies…"
              className="bg-background"
            />

            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">No unmapped colonies match your search.</p>
              ) : (
                filtered.map((hr) => (
                  <div
                    key={hr.id}
                    className="flex flex-col gap-2 rounded-md border bg-background p-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/case/${hr.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {hr.case_number}
                        </Link>
                        <Badge className={cn("text-xs", STATUS_COLORS[hr.status])}>
                          {getStatusLabel(hr.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{colonyAddressPreview(hr)}</p>
                      <p className="text-xs text-muted-foreground">
                        Trap team: {hr.assigned_team_name?.trim() || "Unassigned"}
                      </p>
                    </div>
                    {canEdit && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => setEditingCase(hr)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit address
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <HotspotColonyAddressDialog
        helpRequest={editingCase}
        open={editingCase != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setEditingCase(null);
        }}
        onSaved={(updated, geocoded) => {
          onHelpRequestUpdated(updated);
          if (geocoded) {
            setEditingCase(null);
          } else {
            setEditingCase(updated);
          }
        }}
      />
    </>
  );
}
