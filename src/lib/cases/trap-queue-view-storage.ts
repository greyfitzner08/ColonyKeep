/** Keys that define Trap Queue filters/layout (search `q` is intentionally excluded). */
export const TRAP_QUEUE_VIEW_PARAM_KEYS = [
  "focus",
  "team",
  "claimed",
  "flag",
  "layout",
  "sort",
  "scope",
  "view",
  "trapSchool",
  "needsClinicDate",
] as const;

export type TrapQueueSavedView = {
  focus?: string;
  team?: string;
  claimed?: string;
  flag?: string;
  layout?: string;
  sort?: string;
  scope?: string;
};

export function trapQueueViewStorageKey(profileId: string) {
  return `trap-queue-view-${profileId}`;
}

export function trapQueueUrlHasViewParams(params: URLSearchParams): boolean {
  return TRAP_QUEUE_VIEW_PARAM_KEYS.some((key) => params.has(key));
}

export function readTrapQueueSavedView(profileId: string): TrapQueueSavedView | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(trapQueueViewStorageKey(profileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TrapQueueSavedView;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeTrapQueueSavedView(profileId: string, view: TrapQueueSavedView) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(trapQueueViewStorageKey(profileId), JSON.stringify(view));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

/** Build a saved view from the live URL + resolved focus/team (so defaults stick). */
export function trapQueueParamsToSavedView(options: {
  params: URLSearchParams;
  focus: string;
  teamScope: string;
  showOthersClaimed: boolean;
}): TrapQueueSavedView {
  const { params, focus, teamScope, showOthersClaimed } = options;
  const scope = params.get("scope");
  const flag = params.get("flag");
  const layout = params.get("layout");
  const sort = params.get("sort");

  return {
    focus,
    team: teamScope,
    claimed: showOthersClaimed ? "show" : undefined,
    flag: flag && flag !== "all" ? flag : undefined,
    layout: layout === "table" ? "table" : undefined,
    sort: sort || "date_asc",
    scope: scope === "closed" || scope === "history" ? scope : undefined,
  };
}

export function trapQueueSavedViewToSearchParams(
  view: TrapQueueSavedView
): URLSearchParams {
  const params = new URLSearchParams();

  if (view.scope === "closed" || view.scope === "history") {
    params.set("scope", view.scope);
  }
  if (view.focus) params.set("focus", view.focus);
  if (view.team) params.set("team", view.team);
  if (view.claimed === "show") params.set("claimed", "show");
  if (view.flag && view.flag !== "all") params.set("flag", view.flag);
  if (view.layout === "table") params.set("layout", "table");
  if (view.sort) params.set("sort", view.sort);

  return params;
}

export function trapQueueSavedViewHref(view: TrapQueueSavedView): string {
  const query = trapQueueSavedViewToSearchParams(view).toString();
  return query ? `/trap-queue?${query}` : "/trap-queue";
}
