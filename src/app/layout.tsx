import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Inter } from "next/font/google";
import { BrandingProvider } from "@/components/branding/branding-provider";
import { brandingThemeStyle } from "@/lib/branding";
import { getPlatformBranding } from "@/lib/branding-server";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getPlatformBranding();
  return {
    title: `${branding.app_name} — Colony Management`,
    description: "Trap-Neuter-Vaccinate-Return cat colony management platform",
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
