import type { Metadata } from "next";
import { EntranceApplicationForm } from "@/components/adoption/entrance-application-form";
import { getPlatformBranding } from "@/lib/branding-server";

export const metadata: Metadata = {
  title: "Adoption Program Entrance",
};

export default async function AdoptionEntrancePage() {
  const branding = await getPlatformBranding();
  return (
    <EntranceApplicationForm
      aboutMessage={branding.adoption_entrance_about_message}
      donateUrl={branding.intake_donate_url}
      donateText={branding.intake_donate_text}
    />
  );
}
