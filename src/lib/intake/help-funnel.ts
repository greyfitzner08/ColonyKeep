import { intakeAboutPlainText, sanitizeIntakeAboutHtml } from "@/lib/intake-about-html";

/** Yes/No fields from the inquiry form "How you can help" step. */
export const INTAKE_HELP_FUNNEL_FIELDS = [
  {
    key: "trapping_experience",
    label: "Trapping experience",
  },
  {
    key: "need_traps",
    label: "Needs to borrow traps",
  },
  {
    key: "willing_to_trap_transport",
    label: "Willing to trap & transport",
  },
  {
    key: "able_to_trap_transport",
    label: "Able to trap & transport",
  },
  {
    key: "has_recovery_space",
    label: "Has recovery space",
  },
] as const;

export type IntakeHelpFunnelFieldKey = (typeof INTAKE_HELP_FUNNEL_FIELDS)[number]["key"];

export type IntakeHelpAnswerMatch = "any" | "Yes" | "No";

export interface IntakeHelpFunnelLink {
  label: string;
  url: string;
}

export interface IntakeHelpFunnelConditions {
  trapping_experience?: IntakeHelpAnswerMatch;
  need_traps?: IntakeHelpAnswerMatch;
  willing_to_trap_transport?: IntakeHelpAnswerMatch;
  able_to_trap_transport?: IntakeHelpAnswerMatch;
  has_recovery_space?: IntakeHelpAnswerMatch;
}

export interface IntakeHelpFunnelRule {
  id: string;
  /** Admin-only label for the rule list. */
  name: string;
  enabled: boolean;
  /** Lower numbers are checked first. */
  sort_order: number;
  /** Used when no other enabled rule matches. */
  is_fallback: boolean;
  conditions: IntakeHelpFunnelConditions;
  title: string;
  body: string;
  links: IntakeHelpFunnelLink[];
}

export type IntakeHelpAnswers = Record<IntakeHelpFunnelFieldKey, string>;

const MAX_RULES = 20;
const MAX_NAME = 80;
const MAX_TITLE = 120;
const MAX_BODY = 8000;
const MAX_LINKS = 6;
const MAX_LINK_LABEL = 80;

/** Local helper avoids importing branding (circular). */
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

function newRuleId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeMatch(value: unknown): IntakeHelpAnswerMatch {
  if (value === "Yes" || value === "No") return value;
  return "any";
}

function normalizeConditions(value: unknown): IntakeHelpFunnelConditions {
  if (!value || typeof value !== "object") return {};
  const raw = value as Record<string, unknown>;
  const conditions: IntakeHelpFunnelConditions = {};
  for (const field of INTAKE_HELP_FUNNEL_FIELDS) {
    const match = normalizeMatch(raw[field.key]);
    if (match !== "any") {
      conditions[field.key] = match;
    }
  }
  return conditions;
}

function normalizeLinks(value: unknown): IntakeHelpFunnelLink[] {
  if (!Array.isArray(value)) return [];
  const links: IntakeHelpFunnelLink[] = [];
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

export function createEmptyHelpFunnelRule(
  overrides?: Partial<IntakeHelpFunnelRule>
): IntakeHelpFunnelRule {
  return {
    id: newRuleId(),
    name: "New resource path",
    enabled: true,
    sort_order: 0,
    is_fallback: false,
    conditions: {},
    title: "",
    body: "",
    links: [],
    ...overrides,
  };
}

export function normalizeIntakeHelpFunnelRules(value: unknown): IntakeHelpFunnelRule[] {
  if (!Array.isArray(value)) return [];
  const rules: IntakeHelpFunnelRule[] = [];
  for (const [index, entry] of value.entries()) {
    if (!entry || typeof entry !== "object") continue;
    const raw = entry as Record<string, unknown>;
    const id =
      typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : newRuleId();
    const name =
      typeof raw.name === "string" && raw.name.trim()
        ? raw.name.trim().slice(0, MAX_NAME)
        : "Untitled path";
    const title =
      typeof raw.title === "string" ? raw.title.trim().slice(0, MAX_TITLE) : "";
    const bodyRaw = typeof raw.body === "string" ? raw.body : "";
    const body = sanitizeIntakeAboutHtml(bodyRaw, { allowLinks: true }).slice(0, MAX_BODY);
    const links = normalizeLinks(raw.links);
    const isFallback = raw.is_fallback === true;
    const hasBody = Boolean(intakeAboutPlainText(body).trim());
    // Keep named drafts so admins can save in-progress paths.
    if (!title && !hasBody && links.length === 0 && !isFallback && name === "Untitled path") {
      continue;
    }

    rules.push({
      id,
      name,
      enabled: raw.enabled !== false,
      sort_order:
        typeof raw.sort_order === "number" && Number.isFinite(raw.sort_order)
          ? raw.sort_order
          : index,
      is_fallback: isFallback,
      conditions: normalizeConditions(raw.conditions),
      title,
      body,
      links,
    });
    if (rules.length >= MAX_RULES) break;
  }

  return rules
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    .map((rule, index) => ({ ...rule, sort_order: index }));
}

function answersMatchRule(
  answers: IntakeHelpAnswers,
  conditions: IntakeHelpFunnelConditions
): boolean {
  for (const field of INTAKE_HELP_FUNNEL_FIELDS) {
    const expected = conditions[field.key] ?? "any";
    if (expected === "any") continue;
    const actual = (answers[field.key] ?? "").trim();
    if (actual !== expected) return false;
  }
  return true;
}

/** First enabled matching rule wins; otherwise the enabled fallback, if any. */
export function matchIntakeHelpFunnelRule(
  rules: IntakeHelpFunnelRule[],
  answers: IntakeHelpAnswers
): IntakeHelpFunnelRule | null {
  const enabled = rules
    .filter((rule) => rule.enabled)
    .sort((a, b) => a.sort_order - b.sort_order);

  for (const rule of enabled) {
    if (rule.is_fallback) continue;
    if (answersMatchRule(answers, rule.conditions)) {
      return rule;
    }
  }

  return enabled.find((rule) => rule.is_fallback) ?? null;
}
