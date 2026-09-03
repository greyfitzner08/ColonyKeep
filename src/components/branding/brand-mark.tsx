"use client";

import Image from "next/image";
import { Cat } from "lucide-react";
import { useBranding } from "@/components/branding/branding-provider";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  iconClassName?: string;
  nameClassName?: string;
  showName?: boolean;
  /** Override context values (useful for admin draft preview). */
  appName?: string;
  logoUrl?: string | null;
  /** Optional subtitle under the app name (e.g. sidebar). */
  subtitle?: string;
  subtitleClassName?: string;
}

export function BrandMark({
  className,
  iconClassName,
  nameClassName,
  showName = true,
  appName,
  logoUrl,
  subtitle,
  subtitleClassName,
}: BrandMarkProps) {
  const branding = useBranding();
  const name = appName?.trim() || branding.app_name;
  const logo = logoUrl === undefined ? branding.logo_url : logoUrl;

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {logo ? (
        <span className={cn("relative h-8 w-8 shrink-0 overflow-hidden rounded-md", iconClassName)}>
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
