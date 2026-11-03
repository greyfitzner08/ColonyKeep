import type { MapFeeder } from "@/components/maps/hotspots-map";
import type { HelpRequest } from "@/lib/types";

function emailsMatch(a?: string | null, b?: string | null): boolean {
  const left = a?.trim().toLowerCase() ?? "";
  const right = b?.trim().toLowerCase() ?? "";
  return Boolean(left && right && left === right);
}

/** Assigned-only users may see contacts for cases they claimed or reported. */
export function canViewRestrictedCaseContacts(
  hr: Pick<HelpRequest, "claimed_by_email" | "contact_email">,
  actorEmail: string | null | undefined
): boolean {
  return (
    emailsMatch(hr.claimed_by_email, actorEmail) ||
    emailsMatch(hr.contact_email, actorEmail)
  );
}

export function redactHelpRequestContacts(hr: HelpRequest): HelpRequest {
  return {
    ...hr,
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    contact_first_name: null,
    contact_last_name: null,
    contact_street: null,
    contact_city: null,
    contact_state: null,
    contact_zip: null,
    contact_county: null,
    // Keep city/ZIP/county + coords for map context; hide street-level address.
    colony_address: null,
    feeder_name: null,
    feeder_phone: null,
    feeder_email: null,
    feeder_street: null,
  };
}

export function redactHotspotFeeder(feeder: MapFeeder): MapFeeder {
  return {
    ...feeder,
    feeder_name: null,
    feeder_phone: null,
    feeder_email: null,
    feeder_street: null,
    detailsVisible: false,
  };
}

export type HotspotHelpRequest = HelpRequest & {
  /** False when contact/street details were redacted for this viewer. */
  details_visible?: boolean;
};

export function applyHotspotContactPrivacy(options: {
  helpRequests: HelpRequest[];
  feeders: MapFeeder[];
  assignedOnly: boolean;
  actorEmail: string | null | undefined;
}): { helpRequests: HotspotHelpRequest[]; feeders: MapFeeder[] } {
  const { helpRequests, feeders, assignedOnly, actorEmail } = options;

  if (!assignedOnly) {
    return {
      helpRequests: helpRequests.map((hr) => ({ ...hr, details_visible: true })),
      feeders: feeders.map((feeder) => ({ ...feeder, detailsVisible: true })),
    };
  }

  const visibleById = new Map(
    helpRequests.map((hr) => [hr.id, canViewRestrictedCaseContacts(hr, actorEmail)])
  );

  return {
    helpRequests: helpRequests.map((hr) => {
      const detailsVisible = visibleById.get(hr.id) === true;
      if (detailsVisible) return { ...hr, details_visible: true };
      return { ...redactHelpRequestContacts(hr), details_visible: false };
    }),
    feeders: feeders.map((feeder) => {
      const detailsVisible = visibleById.get(feeder.id) === true;
      if (detailsVisible) return { ...feeder, detailsVisible: true };
      return redactHotspotFeeder(feeder);
    }),
  };
}
