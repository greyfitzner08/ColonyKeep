import type { Profile } from "@/lib/types";

export type DuplicateMatchReason = "phone" | "name_birthday" | "name";

export interface DuplicateProfileGroup {
  id: string;
  reasons: DuplicateMatchReason[];
  profiles: Profile[];
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeName(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePhone(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function reasonLabel(reason: DuplicateMatchReason): string {
  switch (reason) {
    case "phone":
      return "Same phone number";
    case "name_birthday":
      return "Same name and birthday";
    case "name":
      return "Same name";
  }
}

export function duplicateReasonLabels(reasons: DuplicateMatchReason[]): string {
  return reasons.map(reasonLabel).join(" · ");
}

/**
 * Groups likely duplicate profiles for admin review.
 * Exact same email is not treated as a pair (profiles should already be unique by login email).
 */
export function findDuplicateProfileGroups(profiles: Profile[]): DuplicateProfileGroup[] {
  const byPhone = new Map<string, Profile[]>();
  const byNameBirthday = new Map<string, Profile[]>();
  const byName = new Map<string, Profile[]>();

  for (const profile of profiles) {
    const phone = normalizePhone(profile.phone);
    if (phone.length >= 10) {
      const list = byPhone.get(phone) ?? [];
      list.push(profile);
      byPhone.set(phone, list);
    }

    const name = normalizeName(profile.full_name);
    if (!name) continue;

    if (profile.birthday) {
      const key = `${name}|${profile.birthday}`;
      const list = byNameBirthday.get(key) ?? [];
      list.push(profile);
      byNameBirthday.set(key, list);
    }

    const nameList = byName.get(name) ?? [];
    nameList.push(profile);
    byName.set(name, nameList);
  }

  const pairReasons = new Map<string, Set<DuplicateMatchReason>>();

  function addPairs(list: Profile[], reason: DuplicateMatchReason) {
    if (list.length < 2) return;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!;
        const b = list[j]!;
        if (normalizeEmail(a.email) === normalizeEmail(b.email)) continue;
        const key = [a.id, b.id].sort().join(":");
        const reasons = pairReasons.get(key) ?? new Set<DuplicateMatchReason>();
        reasons.add(reason);
        pairReasons.set(key, reasons);
      }
    }
  }

  for (const list of byPhone.values()) addPairs(list, "phone");
  for (const list of byNameBirthday.values()) addPairs(list, "name_birthday");

  // Name-only matches only when neither phone nor name+birthday already linked them,
  // and both lack a conflicting distinct phone — keep noise down by requiring name+birthday
  // OR phone as primary; name-only is secondary for people with no phone/birthday.
  for (const list of byName.values()) {
    if (list.length < 2) continue;
    const thin = list.filter((p) => !normalizePhone(p.phone) && !p.birthday);
    addPairs(thin, "name");
  }

  // Union-find style clustering of connected pairs
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

  const profileById = new Map(profiles.map((p) => [p.id, p]));

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

  const groups: DuplicateProfileGroup[] = [];

  for (const [, memberIds] of clusters) {
    if (memberIds.size < 2) continue;
    const members = Array.from(memberIds)
      .map((id) => profileById.get(id))
      .filter((p): p is Profile => Boolean(p))
      .sort((a, b) => (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email));

    if (members.length < 2) continue;

    const reasons = new Set<DuplicateMatchReason>();
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
      profiles: members,
    });
  }

  groups.sort((a, b) => b.profiles.length - a.profiles.length || a.id.localeCompare(b.id));
  return groups;
}
