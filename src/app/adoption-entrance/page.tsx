import type { Metadata } from "next";
import { EntranceApplicationForm } from "@/components/adoption/entrance-application-form";
import { getPlatformBranding } from "@/lib/branding-server";

export const metadata: Metadata = {
  title: "Rescue Application",
};

export default async function AdoptionEntrancePage() {
  const branding = await getPlatformBranding();
  return (
    <EntranceApplicationForm
      aboutMessage={branding.adoption_entrance_about_message}
      buttonUrl={branding.adoption_entrance_button_url}
      buttonText={branding.adoption_entrance_button_text}
      links={branding.adoption_entrance_links}
    />
  );
}
