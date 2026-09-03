export const DEFAULT_APP_NAME = "TNVR Rescue";

export interface PlatformBranding {
  app_name: string;
  logo_url: string | null;
}

export function defaultPlatformBranding(): PlatformBranding {
  return {
    app_name: DEFAULT_APP_NAME,
    logo_url: null,
  };
}

export function normalizePlatformBranding(
  row: { app_name?: string | null; logo_url?: string | null } | null | undefined
): PlatformBranding {
  const name = row?.app_name?.trim();
  const logo = row?.logo_url?.trim();
  return {
    app_name: name || DEFAULT_APP_NAME,
    logo_url: logo || null,
  };
}
