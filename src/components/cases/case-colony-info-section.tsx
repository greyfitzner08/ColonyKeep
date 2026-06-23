import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailField, DetailSection, formatAddress } from "@/components/cases/case-detail-fields";
import { formatDateTime } from "@/lib/utils";
import type { HelpRequest } from "@/lib/types";

interface CaseColonyInfoSectionProps {
  helpRequest: HelpRequest;
}

/** Read-only display of all reporter / colony fields from the intake form & CSV import. */
export function CaseColonyInfoSection({ helpRequest: hr }: CaseColonyInfoSectionProps) {
  const contactAddress = formatAddress([
    hr.contact_street,
    hr.contact_city,
    hr.contact_state,
    hr.contact_zip,
    hr.contact_county,
  ]);
  const colonyAddress = formatAddress([
    hr.colony_address,
    hr.colony_city,
    hr.colony_state,
    hr.colony_zip,
    hr.colony_county,
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Colony & Reporter Information</CardTitle>
        <CardDescription>
          Everything submitted on the intake form or imported from CSV — contact details, colony
          location, cat counts, and willingness to help.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <DetailSection title="Contact Person">
          <DetailField alwaysShow label="First Name" value={hr.contact_first_name} />
          <DetailField alwaysShow label="Last Name" value={hr.contact_last_name} />
          <DetailField alwaysShow label="Phone Number" value={hr.contact_phone} />
          <DetailField alwaysShow label="Email" value={hr.contact_email} />
          <DetailField alwaysShow label="Street Address" value={hr.contact_street} />
          <DetailField alwaysShow label="City" value={hr.contact_city} />
          <DetailField alwaysShow label="State" value={hr.contact_state} />
          <DetailField alwaysShow label="Zip Code" value={hr.contact_zip} />
          <DetailField alwaysShow label="County" value={hr.contact_county} />
          <DetailField alwaysShow label="Full Contact Address" value={contactAddress} />
          <DetailField
            alwaysShow
            label="Your Relationship to the Cats"
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
            label="Colony Street Address (no City/State/Zip)"
            value={hr.colony_address}
          />
          <DetailField alwaysShow label="Colony City" value={hr.colony_city} />
          <DetailField alwaysShow label="Colony State" value={hr.colony_state} />
          <DetailField alwaysShow label="Colony Zip Code" value={hr.colony_zip} />
          <DetailField alwaysShow label="Colony County" value={hr.colony_county} />
          <DetailField alwaysShow label="Full Colony Location" value={colonyAddress} />
        </DetailSection>

        <DetailSection title="Colony Cat Counts">
          <DetailField
            alwaysShow
            label="Total Number of Cats (OVER 8 weeks/2 months)"
            value={hr.cats_over_8_weeks}
          />
          <DetailField
            alwaysShow
            label="Total Number of Kittens (UNDER 8 weeks/2 months)"
            value={hr.kittens_under_8_weeks}
          />
          <DetailField
            alwaysShow
            label="Number You Suspect Are Pregnant"
            value={hr.pregnant_count}
          />
          <DetailField
            alwaysShow
            label="Total Cats in Colony"
            value={hr.cats_over_8_weeks + hr.kittens_under_8_weeks}
          />
        </DetailSection>

        <DetailSection title="Feeding & Trapping">
          <DetailField alwaysShow label="Are You Feeding the Cats?" value={hr.feeding_cats} />
          <DetailField
            alwaysShow
            label="If You Are Not Feeding, Who Is?"
            value={hr.feeder_if_not}
          />
          <DetailField
            alwaysShow
            label="Do You Have Trapping Experience?"
            value={hr.trapping_experience}
          />
          <DetailField alwaysShow label="Do You Need to Borrow Traps?" value={hr.need_traps} />
          <DetailField
            alwaysShow
            label="Are You Willing to Trap and Transport?"
            value={hr.willing_to_trap_transport}
          />
          <DetailField
            alwaysShow
            label="Are You Able to Trap and Transport?"
            value={hr.able_to_trap_transport}
          />
          <DetailField
            alwaysShow
            label="Recovery Space Before/After Surgery?"
            value={hr.has_recovery_space}
          />
        </DetailSection>

        <DetailSection title="Reporter Notes">
          <div className="sm:col-span-2 lg:col-span-3">
            <DetailField
              alwaysShow
              label="Anything Else About This Colony"
              value={hr.intake_notes}
            />
          </div>
        </DetailSection>
      </CardContent>
    </Card>
  );
}
