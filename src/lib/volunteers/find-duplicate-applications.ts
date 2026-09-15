import type { VolunteerApplication } from "@/lib/types";

export type ApplicationDuplicateReason = "email" | "phone" | "name_birthday" | "name";

export interface DuplicateApplicationGroup {
  id: string;
  reasons: ApplicationDuplicateReason[];
  applications: VolunteerApplication[];
}

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

function normalizeName(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePhone(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function normalizeBirthday(birthday: string | null | undefined): string | null {
  const raw = (birthday ?? "").trim();
  if (!raw) return null;
  const isoDay = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return isoDay;
  const parsed = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function reasonLabel(reason: ApplicationDuplicateReason): string {
  switch (reason) {
    case "email":
      return "Same email";
    case "phone":
      return "Same phone number";
    case "name_birthday":
      return "Same name and birthday";
    case "name":
      return "Same name";
  }
}

export function applicationDuplicateReasonLabels(reasons: ApplicationDuplicateReason[]): string {
  const order: ApplicationDuplicateReason[] = ["email", "phone", "name_birthday", "name"];
  return order.filter((reason) => reasons.includes(reason)).map(reasonLabel).join(" · ");
}

/**
 * Groups likely duplicate volunteer applications for admin review.
 * Includes exact email matches (profiles are unique by email; applications are not).
 */
export function findDuplicateApplicationGroups(
  applications: VolunteerApplication[]
): DuplicateApplicationGroup[] {
  const byEmail = new Map<string, VolunteerApplication[]>();
  const byPhone = new Map<string, VolunteerApplication[]>();
  const byNameBirthday = new Map<string, VolunteerApplication[]>();
  const byName = new Map<string, VolunteerApplication[]>();

  for (const application of applications) {
    const email = normalizeEmail(application.email);
    if (email) {
      const list = byEmail.get(email) ?? [];
      list.push(application);
      byEmail.set(email, list);
    }

    const phone = normalizePhone(application.phone);
    if (phone.length >= 10) {
      const list = byPhone.get(phone) ?? [];
      list.push(application);
      byPhone.set(phone, list);
    }

    const name = normalizeName(application.full_name);
    if (!name) continue;

    const birthday = normalizeBirthday(application.birthday);
    if (birthday) {
      const key = `${name}|${birthday}`;
      const list = byNameBirthday.get(key) ?? [];
      list.push(application);
      byNameBirthday.set(key, list);
    }

    const nameList = byName.get(name) ?? [];
    nameList.push(application);
    byName.set(name, nameList);
  }

  const pairReasons = new Map<string, Set<ApplicationDuplicateReason>>();

  function addPairs(list: VolunteerApplication[], reason: ApplicationDuplicateReason) {
    if (list.length < 2) return;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!;
        const b = list[j]!;
        const key = [a.id, b.id].sort().join(":");
        const reasons = pairReasons.get(key) ?? new Set<ApplicationDuplicateReason>();
        reasons.add(reason);
        pairReasons.set(key, reasons);
      }
    }
  }

  for (const list of byEmail.values()) addPairs(list, "email");
  for (const list of byPhone.values()) addPairs(list, "phone");
  for (const list of byNameBirthday.values()) addPairs(list, "name_birthday");
  for (const list of byName.values()) addPairs(list, "name");

  const parent = new Map<string, string>();
  function find(id: string): string {
    const current = parent.get(id) ?? id;
    if (current === id) return id;
    const root = find(current);
    parent.set(id, root);
    return root;
  }
  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  const applicationById = new Map(applications.map((app) => [app.id, app]));

  for (const pairKey of pairReasons.keys()) {
    const [a, b] = pairKey.split(":");
    if (!a || !b) continue;
    union(a, b);
  }

  const clusters = new Map<string, Set<string>>();
  for (const pairKey of pairReasons.keys()) {
    const [a, b] = pairKey.split(":");
    if (!a || !b) continue;
    const root = find(a);
    const set = clusters.get(root) ?? new Set<string>();
    set.add(a);
    set.add(b);
    clusters.set(root, set);
  }

  const groups: DuplicateApplicationGroup[] = [];

  for (const [, memberIds] of clusters) {
    if (memberIds.size < 2) continue;
    const members = Array.from(memberIds)
      .map((id) => applicationById.get(id))
      .filter((app): app is VolunteerApplication => Boolean(app))
      .sort((a, b) => a.full_name.localeCompare(b.full_name) || a.email.localeCompare(b.email));

    if (members.length < 2) continue;

    const reasons = new Set<ApplicationDuplicateReason>();
    for (const [pairKey, pairReasonSet] of pairReasons) {
      const [a, b] = pairKey.split(":");
      if (!a || !b) continue;
      if (memberIds.has(a) && memberIds.has(b)) {
        for (const reason of pairReasonSet) reasons.add(reason);
      }
    }

    groups.push({
      id: Array.from(memberIds).sort().join(":"),
      reasons: Array.from(reasons),
      applications: members,
    });
  }

  groups.sort((a, b) => b.applications.length - a.applications.length || a.id.localeCompare(b.id));
  return groups;
}

export function applicationIdsInDuplicateGroups(
  groups: DuplicateApplicationGroup[]
): Set<string> {
  const ids = new Set<string>();
  for (const group of groups) {
    for (const application of group.applications) ids.add(application.id);
  }
  return ids;
}
