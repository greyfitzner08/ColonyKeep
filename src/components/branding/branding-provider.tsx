"use client";

import { createContext, useContext, useEffect, type CSSProperties, type ReactNode } from "react";
import {
  DEFAULT_APP_NAME,
  brandingThemeStyle,
  defaultPlatformBranding,
  type PlatformBranding,
} from "@/lib/branding";

const BrandingContext = createContext<PlatformBranding>(defaultPlatformBranding());

export function BrandingProvider({
  branding,
  children,
}: {
  branding: PlatformBranding;
  children: ReactNode;
}) {
  useEffect(() => {
    const vars = brandingThemeStyle(branding);
    const root = document.documentElement;
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
    return () => {
      for (const key of Object.keys(vars)) {
        root.style.removeProperty(key);
      }
    };
  }, [branding]);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export function useBranding(): PlatformBranding {
  return useContext(BrandingContext);
}

export function useAppName(): string {
  return useBranding().app_name || DEFAULT_APP_NAME;
}

export function brandingStyleProps(
  branding: Pick<PlatformBranding, "primary_color" | "sidebar_color">
): CSSProperties {
  return brandingThemeStyle(branding) as CSSProperties;
}
