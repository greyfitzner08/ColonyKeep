import { ColonyIntakeForm } from "@/components/intake/colony-intake-form";
import { getPlatformBranding } from "@/lib/branding-server";

export const dynamic = "force-dynamic";

export default async function RequestPage() {
  const branding = await getPlatformBranding();
  return (
    <ColonyIntakeForm
      aboutMessage={branding.intake_about_message}
      donateUrl={branding.intake_donate_url}
      donateText={branding.intake_donate_text}
    />
  );
}
