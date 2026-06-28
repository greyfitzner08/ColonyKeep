"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import { CaseFeederFields } from "@/components/cases/case-feeder-fields";
import { InfoRow } from "@/components/cases/case-detail-fields";
import { formatSingleLineAddress } from "@/lib/cases/colony-notes";
import type { HelpRequest } from "@/lib/types";
import { Check, Pencil, X } from "lucide-react";

interface CaseFeederSectionProps {
  helpRequest: HelpRequest;
  saving?: boolean;
  onChange: (next: HelpRequest) => void;
}

function feederAddress(hr: HelpRequest) {
  return formatSingleLineAddress([
    hr.feeder_street,
    hr.feeder_city,
    hr.feeder_state,
    hr.feeder_zip,
    hr.feeder_county,
  ]);
}

function hasFeederDetails(hr: HelpRequest) {
  return Boolean(
    hr.feeder_name?.trim() ||
      hr.feeder_phone?.trim() ||
      hr.feeder_email?.trim() ||
      hr.feeder_street?.trim() ||
      hr.feeder_city?.trim() ||
      hr.feeder_zip?.trim() ||
      hr.feeder_county?.trim()
  );
}

export function CaseFeederSection({
  helpRequest,
  saving = false,
  onChange,
}: CaseFeederSectionProps) {
  const [editing, setEditing] = useState(false);
  const snapshotRef = useRef<HelpRequest | null>(null);
  const address = feederAddress(helpRequest);

  function startEditing() {
    snapshotRef.current = helpRequest;
    setEditing(true);
  }

  function cancelEditing() {
    if (snapshotRef.current) {
      onChange(snapshotRef.current);
    }
    setEditing(false);
  }

  function doneEditing() {
    setEditing(false);
  }

  return (
    <CaseCollapsibleSection
      title="Colony feeder"
      description="Contact for the person feeding the colony when they are not the reporter."
      defaultOpen
    >
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          {editing ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancelEditing}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={doneEditing} disabled={saving}>
                <Check className="h-4 w-4 mr-1" />
                Done
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={startEditing}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>

        {editing ? (
          <>
            <CaseFeederFields
              helpRequest={helpRequest}
              onChange={onChange}
              idPrefix="colony-feeder"
            />
            {saving && <p className="text-xs text-muted-foreground">Saving feeder info…</p>}
          </>
        ) : (
          <>
            {hasFeederDetails(helpRequest) ? (
              <dl>
                <InfoRow label="Name" value={helpRequest.feeder_name} alwaysShow />
                <InfoRow label="Phone" value={helpRequest.feeder_phone} alwaysShow />
                <InfoRow label="Email" value={helpRequest.feeder_email} alwaysShow />
                <InfoRow label="Address" value={address} alwaysShow />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No feeder details recorded yet.</p>
            )}
            {helpRequest.feeder_if_not && (
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-sm font-medium">Original intake note</p>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {helpRequest.feeder_if_not}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </CaseCollapsibleSection>
  );
}
