"use client";

import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import { CaseFeederSection } from "@/components/cases/case-feeder-section";
import { CatCountSummaryDisplay } from "@/components/cases/cat-count-summary-display";
import { InfoRow } from "@/components/cases/case-detail-fields";
import { AddTrackedCatForm } from "@/components/cases/add-tracked-cat-form";
import { ClinicFixSummary } from "@/components/cases/clinic-fix-summary";
import { TrackedCatCard } from "@/components/cases/tracked-cat-card";
import { formatSingleLineAddress } from "@/lib/cases/colony-notes";
import { summarizeCatCounts } from "@/lib/cases/cat-counts";
import type { Cat, ClinicFix, HelpRequest } from "@/lib/types";

interface CaseColonyTabProps {
  helpRequest: HelpRequest;
  clinicFixes: ClinicFix[];
  cats: Cat[];
  clinics: { id: string; name: string }[];
  savingFeeder?: boolean;
  canLogClinicFix: boolean;
  onFeederChange: (next: HelpRequest) => void;
  onCatUpdated: (cat: Cat) => void;
  onCatAdded: (cat: Cat) => void;
}

export function CaseColonyTab({
  helpRequest: hr,
  clinicFixes,
  cats,
  clinics,
  savingFeeder = false,
  canLogClinicFix,
  onFeederChange,
  onCatUpdated,
  onCatAdded,
}: CaseColonyTabProps) {
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
      >
        <CatCountSummaryDisplay counts={counts} pregnantCount={hr.pregnant_count} />
        <p className="mt-3 text-sm text-muted-foreground">
          Cats sent to foster/facility are removed from still-at-colony counts; fixed cats returned
          to the colony remain counted there.
        </p>

        {cats.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No individual cats tracked yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {cats.map((cat) => (
              <TrackedCatCard
                key={cat.id}
                cat={cat}
                clinics={clinics}
                helpRequestId={hr.id}
                caseNumber={hr.case_number}
                clinicFix={clinicFixByCatId.get(cat.id) ?? null}
                canLogClinicFix={canLogClinicFix}
                onUpdated={onCatUpdated}
              />
            ))}
          </div>
        )}
      </CaseCollapsibleSection>

      <CaseFeederSection helpRequest={hr} saving={savingFeeder} onChange={onFeederChange} />

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

      <AddTrackedCatForm
        helpRequestId={hr.id}
        defaultOpen={cats.length === 0}
        onAdded={onCatAdded}
      />
    </div>
  );
}
