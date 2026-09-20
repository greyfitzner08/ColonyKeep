import type { Metadata } from "next";
import { getPlatformBranding } from "@/lib/branding-server";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getPlatformBranding();
  return {
    title: `Report a Cat Colony in Mecklenburg County — ${branding.app_name}`,
    description:
      "Public form to report a cat colony in Mecklenburg County, NC to Friends of Feral Felines",
  };
}

export default function RequestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
