import type { Metadata } from "next";
import { getPlatformBranding } from "@/lib/branding";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getPlatformBranding();
  return {
    title: `Report a Cat Colony — ${branding.app_name}`,
    description: "Public community form to request help with a cat colony",
  };
}

export default function RequestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
