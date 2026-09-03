export const DEFAULT_APP_NAME = "TNVR Rescue";

/** Default brand teal — matches globals.css --primary. */
export const DEFAULT_PRIMARY_COLOR = "#21966B";
/** Default sidebar — matches prior hardcoded sidebar color. */
export const DEFAULT_SIDEBAR_COLOR = "#142E26";

export interface PlatformBranding {
  app_name: string;
  logo_url: string | null;
  primary_color: string;
  sidebar_color: string;
}

export function defaultPlatformBranding(): PlatformBranding {
  return {
    app_name: DEFAULT_APP_NAME,
    logo_url: null,
    primary_color: DEFAULT_PRIMARY_COLOR,
    sidebar_color: DEFAULT_SIDEBAR_COLOR,
  };
}

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{6})$/;

export function isValidHexColor(value: string | null | undefined): value is string {
  return typeof value === "string" && HEX_COLOR_RE.test(value.trim());
}

export function normalizeHexColor(
  value: string | null | undefined,
  fallback: string
): string {
  if (!isValidHexColor(value)) return fallback;
  return `#${value.trim().slice(1).toUpperCase()}`;
}

export function normalizePlatformBranding(
  row:
    | {
        app_name?: string | null;
        logo_url?: string | null;
        primary_color?: string | null;
        sidebar_color?: string | null;
      }
    | null
    | undefined
): PlatformBranding {
  const name = row?.app_name?.trim();
  const logo = row?.logo_url?.trim();
  return {
    app_name: name || DEFAULT_APP_NAME,
    logo_url: logo || null,
    primary_color: normalizeHexColor(row?.primary_color, DEFAULT_PRIMARY_COLOR),
    sidebar_color: normalizeHexColor(row?.sidebar_color, DEFAULT_SIDEBAR_COLOR),
  };
}

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export function hexToHsl(hex: string): HslColor | null {
  const normalized = normalizeHexColor(hex, "");
  if (!normalized) return null;
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslChannels(h: number, s: number, l: number): string {
  return `${Math.round(h)} ${Math.round(clamp(s, 0, 100))}% ${Math.round(clamp(l, 0, 100))}%`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** CSS custom properties (HSL channel form) derived from branding colors. */
export function brandingThemeCssVars(branding: Pick<PlatformBranding, "primary_color" | "sidebar_color">): Record<string, string> {
  const primary = hexToHsl(branding.primary_color) ?? hexToHsl(DEFAULT_PRIMARY_COLOR)!;
  const sidebar = hexToHsl(branding.sidebar_color) ?? hexToHsl(DEFAULT_SIDEBAR_COLOR)!;
  const hue = primary.h;
  const primaryForeground = primary.l > 55 ? "0 0% 10%" : "0 0% 100%";
  const sidebarForeground =
    sidebar.l > 55 ? hslChannels(sidebar.h, 25, 15) : hslChannels(sidebar.h, 20, 90);
  const sidebarAccentL = sidebar.l > 55 ? clamp(sidebar.l - 8, 0, 100) : clamp(sidebar.l + 6, 0, 100);
  const sidebarBorderL = sidebar.l > 55 ? clamp(sidebar.l - 12, 0, 100) : clamp(sidebar.l + 8, 0, 100);

  return {
    "--primary": hslChannels(primary.h, primary.s, primary.l),
    "--primary-foreground": primaryForeground,
    "--ring": hslChannels(primary.h, primary.s, primary.l),
    "--secondary": hslChannels(hue, Math.min(primary.s, 30), 94),
    "--secondary-foreground": hslChannels(hue, Math.min(primary.s, 40), 15),
    "--muted": hslChannels(hue, Math.min(primary.s, 20), 96),
    "--muted-foreground": hslChannels(hue, Math.min(primary.s, 15), 45),
    "--accent": hslChannels(hue, Math.min(primary.s, 40), 92),
    "--accent-foreground": hslChannels(hue, Math.min(primary.s, 40), 15),
    "--border": hslChannels(hue, Math.min(primary.s, 20), 88),
    "--input": hslChannels(hue, Math.min(primary.s, 20), 88),
    "--foreground": hslChannels(hue, Math.min(primary.s, 40), 10),
    "--sidebar": hslChannels(sidebar.h, sidebar.s, sidebar.l),
    "--sidebar-foreground": sidebarForeground,
    "--sidebar-accent": hslChannels(sidebar.h, sidebar.s, sidebarAccentL),
    "--sidebar-border": hslChannels(sidebar.h, Math.min(sidebar.s, 35), sidebarBorderL),
  };
}

export function brandingThemeStyle(
  branding: Pick<PlatformBranding, "primary_color" | "sidebar_color">
): Record<string, string> {
  return brandingThemeCssVars(branding);
}
