"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import { CaseFeederSection } from "@/components/cases/case-feeder-section";
import { CatCountSummaryDisplay } from "@/components/cases/cat-count-summary-display";
import { InfoRow } from "@/components/cases/case-detail-fields";
import { AddTrackedCatDialog } from "@/components/cases/add-tracked-cat-form";
import { ClinicFixSummary } from "@/components/cases/clinic-fix-summary";
import { TrackedCatCard } from "@/components/cases/tracked-cat-card";
import { Button } from "@/components/ui/button";
import { formatSingleLineAddress } from "@/lib/cases/colony-notes";
import { summarizeCatCounts } from "@/lib/cases/cat-counts";
import type { Cat, ClinicFix, HelpRequest } from "@/lib/types";
import { Info, Plus } from "lucide-react";

const CAT_COUNTS_HELP =
  "Originally reported is the intake count. Still need fixing is cats not yet TNR’d. Other / no longer need TNR is only cats that died, moved, or were rehomed — not the cats left to trap.";

function CatCountsInfoTip() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="About colony cat counts"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <Info className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <p
          id={panelId}
          role="note"
          className="absolute right-0 top-full z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-md border bg-popover px-3 py-2 text-sm font-normal leading-relaxed text-popover-foreground shadow-md"
        >
          {CAT_COUNTS_HELP}
        </p>
      ) : null}
    </div>
  );
}

interface CaseColonyTabProps {
  helpRequest: HelpRequest;
  clinicFixes: ClinicFix[];
  cats: Cat[];
  savingFeeder?: boolean;
  canLogClinicFix: boolean;
  readOnly?: boolean;
  onFeederChange: (next: HelpRequest) => void;
  onCatUpdated: (cat: Cat) => void;
  onCatAdded: (cat: Cat) => void;
  onCatRemoved: (catId: string) => void;
}

export function CaseColonyTab({
  helpRequest: hr,
  clinicFixes,
  cats,
  savingFeeder = false,
  canLogClinicFix,
  readOnly = false,
  onFeederChange,
  onCatUpdated,
  onCatAdded,
  onCatRemoved,
}: CaseColonyTabProps) {
  const [addCatOpen, setAddCatOpen] = useState(false);
  const colonyAddress = formatSingleLineAddress([
    hr.colony_address,
    hr.colony_city,
    hr.colony_state,
    hr.colony_zip,
    hr.colony_county,
  ]);
  const counts = summarizeCatCounts(hr, clinicFixes, cats);
  const clinicFixByCatId = new Map(
    clinicFixes.flatMap((fix) => (fix.cat_id ? [[fix.cat_id, fix] as const] : []))
  );
  const orphanClinicFixes = clinicFixes.filter((fix) => !fix.cat_id);

  return (
    <div className="space-y-4">
      <CaseCollapsibleSection title="Colony location" defaultOpen>
        <dl>
          <InfoRow label="Address" value={colonyAddress} alwaysShow />
        </dl>
      </CaseCollapsibleSection>

      <CaseCollapsibleSection
        title={`Cats at colony${cats.length > 0 ? ` (${cats.length})` : ""}`}
        defaultOpen
        headerAction={
          <div className="flex items-center gap-2">
            <CatCountsInfoTip />
            {readOnly ? null : (
              <Button size="sm" onClick={() => setAddCatOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add cats
              </Button>
            )}
          </div>
        }
      >
        <CatCountSummaryDisplay counts={counts} pregnantCount={hr.pregnant_count} />

        {cats.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No individual cats tracked yet.
            {!readOnly && (
              <>
                {" "}
                Use <span className="font-medium">Add cats</span> to get started.
              </>
            )}
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {cats.map((cat) => (
              <TrackedCatCard
                key={cat.id}
                cat={cat}
                helpRequestId={hr.id}
                caseNumber={hr.case_number}
                clinicFix={clinicFixByCatId.get(cat.id) ?? null}
                canLogClinicFix={canLogClinicFix && !readOnly}
                readOnly={readOnly}
                onUpdated={onCatUpdated}
                onRemoved={onCatRemoved}
              />
            ))}
          </div>
        )}
      </CaseCollapsibleSection>

      {!readOnly && (
        <AddTrackedCatDialog
          open={addCatOpen}
          onOpenChange={setAddCatOpen}
          helpRequestId={hr.id}
          onAdded={onCatAdded}
        />
      )}

      <CaseFeederSection
        helpRequest={hr}
        saving={savingFeeder}
        onChange={onFeederChange}
        readOnly={readOnly}
      />

      {orphanClinicFixes.length > 0 && (
        <CaseCollapsibleSection title="Other clinic fixes" defaultOpen>
          <p className="mb-3 text-sm text-muted-foreground">
            Walk-in fixes logged before these cats were tracked individually.
          </p>
          <div className="space-y-2">
            {orphanClinicFixes.map((fix) => (
              <ClinicFixSummary key={fix.id} fix={fix} />
            ))}
          </div>
        </CaseCollapsibleSection>
      )}
    </div>
  );
}
