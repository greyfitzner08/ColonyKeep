import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { Inter } from "next/font/google";
import { BrandingProvider } from "@/components/branding/branding-provider";
import { brandingThemeStyle } from "@/lib/branding";
import { getPlatformBranding } from "@/lib/branding-server";
import { APP_PUBLIC_URL } from "@/lib/org";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getPlatformBranding();
  return {
    metadataBase: new URL(APP_PUBLIC_URL),
    title: `${branding.app_name} — Colony Management`,
    description:
      "Official ColonyKeep volunteer portal for Friends of Feral Felines, a Charlotte nonprofit helping community cats through TNVR.",
    alternates: { canonical: "/" },
    verification: {
      google: "NjVMYcRagc1R4aOMHNAV_-aNyOg3WN1AVGKuHVnr3mo",
    },
    icons: branding.logo_url
      ? {
          icon: [{ url: branding.logo_url }],
          apple: [{ url: branding.logo_url }],
        }
      : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getPlatformBranding();
  const themeStyle = brandingThemeStyle(branding) as CSSProperties;

  return (
    <html lang="en" style={themeStyle}>
      <body className={`${inter.variable} font-sans antialiased`}>
        <BrandingProvider branding={branding}>{children}</BrandingProvider>
      </body>
    </html>
  );
}
