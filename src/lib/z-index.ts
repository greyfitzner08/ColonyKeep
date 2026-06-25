/** Shared stacking order for overlays, navigation, and the platform walkthrough. */
export const Z_INDEX = {
  sidebar: 30,
  previewBanner: 35,
  /** Leaflet map panes default to 200–700; keep app chrome above them on mobile. */
  mobileNavBackdrop: 1000,
  mobileNavPanel: 1010,
  mobileMenuButton: 1020,
  tutorialSidebar: 1050,
  tutorialScrim: 1055,
  tutorialPanel: 1060,
  gate: 1100,
  dialog: 1200,
} as const;
