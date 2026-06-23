import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailField, DetailSection } from "@/components/cases/case-detail-fields";
import { displayColonyNotes, displayContactName } from "@/lib/cases/colony-notes";
import { formatDateTime } from "@/lib/utils";
import type { HelpRequest } from "@/lib/types";

interface CaseColonyInfoSectionProps {
  helpRequest: HelpRequest;
}

/** Read-only display of all reporter / colony fields from the intake form & CSV import. */
export function CaseColonyInfoSection({ helpRequest: hr }: CaseColonyInfoSectionProps) {
  const colonyNotes = displayColonyNotes(hr.intake_notes);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Colony & Reporter Information</CardTitle>
        <CardDescription className="text-base">
          Contact details, colony location, cat counts, and willingness to help from the intake
          form.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-10">
        <DetailSection title="Contact Person">
          <DetailField alwaysShow label="Name" value={displayContactName(hr)} />
          <DetailField alwaysShow label="Phone Number" value={hr.contact_phone} />
          <DetailField alwaysShow label="Email" value={hr.contact_email} />
          <DetailField alwaysShow label="Street Address" value={hr.contact_street} />
          <DetailField alwaysShow label="City" value={hr.contact_city} />
          <DetailField alwaysShow label="State" value={hr.contact_state} />
          <DetailField alwaysShow label="Zip Code" value={hr.contact_zip} />
          <DetailField alwaysShow label="County" value={hr.contact_county} />
          <DetailField
            alwaysShow
            label="Relationship to the Cats"
            value={hr.relationship_to_cats}
          />
          <DetailField alwaysShow label="How Did You Hear About Us?" value={hr.how_heard} />
          <DetailField
            alwaysShow
            label="Agrees to Occasional Communications"
            value={hr.consent_communications}
          />
          <DetailField
            alwaysShow
            label="Apartment / Community Name"
            value={hr.apartment_name}
          />
          <DetailField alwaysShow label="Form Submitted" value={formatDateTime(hr.created_at)} />
        </DetailSection>

        <DetailSection title="Colony Location">
          <DetailField
            alwaysShow
            label="Colony Street Address"
            value={hr.colony_address}
          />
          <DetailField alwaysShow label="Colony City" value={hr.colony_city} />
          <DetailField alwaysShow label="Colony State" value={hr.colony_state} />
          <DetailField alwaysShow label="Colony Zip Code" value={hr.colony_zip} />
          <DetailField alwaysShow label="Colony County" value={hr.colony_county} />
        </DetailSection>

        <DetailSection title="Colony Cat Counts">
          <DetailField
            alwaysShow
            label="Cats Over 8 Weeks"
            value={hr.cats_over_8_weeks}
          />
          <DetailField
            alwaysShow
            label="Kittens Under 8 Weeks"
            value={hr.kittens_under_8_weeks}
          />
          <DetailField
            alwaysShow
            label="Suspected Pregnant"
            value={hr.pregnant_count}
          />
          <DetailField
            alwaysShow
            label="Total in Colony"
            value={hr.cats_over_8_weeks + hr.kittens_under_8_weeks}
          />
        </DetailSection>

        <DetailSection title="Feeding & Trapping">
          <DetailField alwaysShow label="Feeding the Cats?" value={hr.feeding_cats} />
          <DetailField
            alwaysShow
            label="Feeder (If Not Reporter)"
            value={hr.feeder_if_not}
          />
          <DetailField
            alwaysShow
            label="Trapping Experience"
            value={hr.trapping_experience}
          />
          <DetailField alwaysShow label="Need to Borrow Traps?" value={hr.need_traps} />
          <DetailField
            alwaysShow
            label="Willing to Trap and Transport"
            value={hr.willing_to_trap_transport}
          />
          <DetailField
            alwaysShow
            label="Able to Trap and Transport"
            value={hr.able_to_trap_transport}
          />
          <DetailField
            alwaysShow
            label="Recovery Space Available"
            value={hr.has_recovery_space}
          />
        </DetailSection>

        {colonyNotes && (
          <DetailSection title="Reporter Notes">
            <div className="sm:col-span-2 lg:col-span-3">
              <DetailField
                alwaysShow
                label="Anything Else About This Colony"
                value={colonyNotes}
              />
            </div>
          </DetailSection>
        )}
      </CardContent>
    </Card>
  );
}
