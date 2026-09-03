"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  DEFAULT_APP_NAME,
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
  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export function useBranding(): PlatformBranding {
  return useContext(BrandingContext);
}

export function useAppName(): string {
  return useBranding().app_name || DEFAULT_APP_NAME;
}
