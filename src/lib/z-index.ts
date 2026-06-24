/** Shared stacking order for overlays, navigation, and the platform walkthrough. */
export const Z_INDEX = {
  sidebar: 30,
  previewBanner: 35,
  mobileNavBackdrop: 40,
  mobileMenuButton: 45,
  tutorialSidebar: 50,
  tutorialScrim: 55,
  tutorialPanel: 60,
  gate: 70,
  dialog: 80,
} as const;
