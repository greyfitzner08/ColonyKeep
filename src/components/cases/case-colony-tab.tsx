"use client";

import { useState } from "react";
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
import { Plus } from "lucide-react";

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
          readOnly ? undefined : (
            <Button size="sm" onClick={() => setAddCatOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add cat
            </Button>
          )
        }
      >
        <CatCountSummaryDisplay counts={counts} pregnantCount={hr.pregnant_count} />
        <p className="mt-3 text-sm text-muted-foreground">
          Counts track how many cats still need spay/neuter, not how many are physically at the
          colony. Fixed cats are removed from the still-need-fixing total whether they return to the
          colony or go to foster/facility.
        </p>

        {cats.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No individual cats tracked yet.
            {!readOnly && (
              <>
                {" "}
                Use <span className="font-medium">Add cat</span> to get started.
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
