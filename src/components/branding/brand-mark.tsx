"use client";

import Image from "next/image";
import { Cat } from "lucide-react";
import { useBranding } from "@/components/branding/branding-provider";
import { brandingLogoForSurface } from "@/lib/branding";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  iconClassName?: string;
  nameClassName?: string;
  showName?: boolean;
  /**
   * Which background the mark sits on.
   * light = login / public pages; dark = sidebar.
   */
  surface?: "light" | "dark";
  /** Override context values (useful for admin draft preview). */
  appName?: string;
  logoUrl?: string | null;
  logoLightUrl?: string | null;
  /** Optional subtitle under the app name (e.g. sidebar). */
  subtitle?: string;
  subtitleClassName?: string;
}

export function BrandMark({
  className,
  iconClassName,
  nameClassName,
  showName = true,
  surface = "light",
  appName,
  logoUrl,
  logoLightUrl,
  subtitle,
  subtitleClassName,
}: BrandMarkProps) {
  const branding = useBranding();
  const name = appName?.trim() || branding.app_name;
  const logos = {
    logo_url: logoUrl === undefined ? branding.logo_url : logoUrl,
    logo_light_url: logoLightUrl === undefined ? branding.logo_light_url : logoLightUrl,
  };
  const logo = brandingLogoForSurface(logos, surface);
  const usingDarkLogoOnLight =
    surface === "light" && Boolean(logos.logo_url) && !logos.logo_light_url && logo === logos.logo_url;
  const usingLightLogoOnDark =
    surface === "dark" && Boolean(logos.logo_light_url) && !logos.logo_url && logo === logos.logo_light_url;

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {logo ? (
        <span
          className={cn(
            "relative h-8 w-8 shrink-0 overflow-hidden rounded-md",
            usingDarkLogoOnLight && "bg-sidebar p-0.5",
            usingLightLogoOnDark && "bg-background p-0.5",
            iconClassName
          )}
        >
          <Image
            src={logo}
            alt=""
            fill
            className="object-contain"
            sizes="32px"
            unoptimized
          />
        </span>
      ) : (
        <Cat className={cn("h-8 w-8 shrink-0 text-primary", iconClassName)} aria-hidden />
      )}
      {showName && (
        <span className="min-w-0">
          <span className={cn("block font-semibold leading-tight", nameClassName)}>{name}</span>
          {subtitle ? (
            <span className={cn("block text-xs leading-tight", subtitleClassName)}>{subtitle}</span>
          ) : null}
        </span>
      )}
    </span>
  );
}
