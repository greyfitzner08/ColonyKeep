import { VOLUNTEER_ROLES } from "@/lib/constants";
import { intakeAboutPlainText, sanitizeIntakeAboutHtml } from "@/lib/intake-about-html";
import type { VolunteerRole } from "@/lib/types";

export interface VolunteerSignupStepLink {
  label: string;
  url: string;
}

export interface VolunteerSignupStep {
  id: string;
  /** Admin-only label for the step list and progress pill. */
  name: string;
  enabled: boolean;
  sort_order: number;
  /**
   * Volunteer opportunities that show this step.
   * Empty means every applicant sees it after they choose roles.
   */
  roles: VolunteerRole[];
  /** any = at least one selected role matches; all = every listed role is selected. */
  role_match: "any" | "all";
  title: string;
  body: string;
  links: VolunteerSignupStepLink[];
}

const MAX_STEPS = 20;
const MAX_NAME = 80;
const MAX_TITLE = 120;
const MAX_BODY = 8000;
const MAX_LINKS = 6;
const MAX_LINK_LABEL = 80;

const KNOWN_ROLES = new Set<VolunteerRole>(VOLUNTEER_ROLES.map((role) => role.value));

function newStepId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeHttpsUrl(value: string): string | null {
  let trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    trimmed = `https://${trimmed.replace(/^\/+/, "")}`;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeRoles(value: unknown): VolunteerRole[] {
  if (!Array.isArray(value)) return [];
  const roles: VolunteerRole[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || !KNOWN_ROLES.has(entry as VolunteerRole)) continue;
    const role = entry as VolunteerRole;
    if (!roles.includes(role)) roles.push(role);
  }
  return roles;
}

function normalizeLinks(value: unknown): VolunteerSignupStepLink[] {
  if (!Array.isArray(value)) return [];
  const links: VolunteerSignupStepLink[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const label =
      "label" in entry && typeof entry.label === "string" ? entry.label.trim() : "";
    const rawUrl = "url" in entry && typeof entry.url === "string" ? entry.url : "";
    const url = normalizeHttpsUrl(rawUrl);
    if (!label || !url) continue;
    links.push({ label: label.slice(0, MAX_LINK_LABEL), url });
    if (links.length >= MAX_LINKS) break;
  }
  return links;
}

export function createEmptyVolunteerSignupStep(
  overrides?: Partial<VolunteerSignupStep>
): VolunteerSignupStep {
  return {
    id: newStepId(),
    name: "New application step",
    enabled: true,
    sort_order: 0,
    roles: [],
    role_match: "any",
    title: "",
    body: "",
    links: [],
    ...overrides,
  };
}

export function normalizeVolunteerSignupSteps(value: unknown): VolunteerSignupStep[] {
  if (!Array.isArray(value)) return [];
  const steps: VolunteerSignupStep[] = [];
  for (const [index, entry] of value.entries()) {
    if (!entry || typeof entry !== "object") continue;
    const raw = entry as Record<string, unknown>;
    const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : newStepId();
    const name =
      typeof raw.name === "string" && raw.name.trim()
        ? raw.name.trim().slice(0, MAX_NAME)
        : "Untitled step";
    const title = typeof raw.title === "string" ? raw.title.trim().slice(0, MAX_TITLE) : "";
    const bodyRaw = typeof raw.body === "string" ? raw.body : "";
    const body = sanitizeIntakeAboutHtml(bodyRaw, { allowLinks: true }).slice(0, MAX_BODY);
    const links = normalizeLinks(raw.links);
    const roles = normalizeRoles(raw.roles);
    const hasBody = Boolean(intakeAboutPlainText(body).trim());
    if (!title && !hasBody && links.length === 0 && roles.length === 0 && name === "Untitled step") {
      continue;
    }

    steps.push({
      id,
      name,
      enabled: raw.enabled !== false,
      sort_order:
        typeof raw.sort_order === "number" && Number.isFinite(raw.sort_order)
          ? raw.sort_order
          : index,
      roles,
      role_match: raw.role_match === "all" ? "all" : "any",
      title,
      body,
      links,
    });
    if (steps.length >= MAX_STEPS) break;
  }

  return steps
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    .map((step, index) => ({ ...step, sort_order: index }));
}

function stepMatchesRoles(step: VolunteerSignupStep, selected: VolunteerRole[]): boolean {
  if (step.roles.length === 0) return true;
  if (step.role_match === "all") {
    return step.roles.every((role) => selected.includes(role));
  }
  return step.roles.some((role) => selected.includes(role));
}

/** Enabled steps the applicant should see for the roles they selected. */
export function matchingVolunteerSignupSteps(
  steps: VolunteerSignupStep[],
  selectedRoles: VolunteerRole[]
): VolunteerSignupStep[] {
  return normalizeVolunteerSignupSteps(steps).filter(
    (step) => step.enabled && stepMatchesRoles(step, selectedRoles)
  );
}
