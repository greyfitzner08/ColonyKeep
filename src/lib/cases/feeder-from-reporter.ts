export interface IntakeFeederSource {
  contact_name?: string | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  contact_street?: string | null;
  contact_city?: string | null;
  contact_state?: string | null;
  contact_zip?: string | null;
  contact_county?: string | null;
  colony_address?: string | null;
  colony_city?: string | null;
  colony_state?: string | null;
  colony_zip?: string | null;
  colony_county?: string | null;
  colony_lat?: number | null;
  colony_lng?: number | null;
  feeding_cats?: string | boolean | null;
  relationship_to_cats?: string | null;
}

export interface IntakeFeederFields {
  feeder_name: string | null;
  feeder_phone: string | null;
  feeder_email: string | null;
  feeder_street: string | null;
  feeder_city: string | null;
  feeder_state: string | null;
  feeder_zip: string | null;
  feeder_county: string | null;
  feeder_lat?: number | null;
  feeder_lng?: number | null;
}

function emptyToNull(value: string | undefined | null) {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

export function reporterIsColonyFeeder(input: {
  feeding_cats?: string | boolean | null;
  relationship_to_cats?: string | null;
}) {
  if (input.feeding_cats === true) return true;
  if (typeof input.feeding_cats === "string") {
    const normalized = input.feeding_cats.trim().toLowerCase();
    if (["yes", "y", "true", "1"].includes(normalized)) return true;
  }
  return /\bfeeder\b/i.test(String(input.relationship_to_cats ?? ""));
}

function feederNameFromSource(body: IntakeFeederSource): string | null {
  const fromParts = [body.contact_first_name, body.contact_last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fromParts) return fromParts;
  return emptyToNull(body.contact_name);
}

/** Copy reporter contact + colony location into map feeder fields when they are the feeder. */
export function buildFeederFieldsFromIntake(body: IntakeFeederSource): IntakeFeederFields | null {
  if (!reporterIsColonyFeeder(body)) return null;

  const colonyStreet = String(body.colony_address ?? "").trim();
  const useColonyAddress = colonyStreet.length > 0;

  return {
    feeder_name: feederNameFromSource(body),
    feeder_phone: emptyToNull(body.contact_phone),
    feeder_email: emptyToNull(body.contact_email),
    feeder_street: useColonyAddress ? colonyStreet : emptyToNull(body.contact_street),
    feeder_city: useColonyAddress ? emptyToNull(body.colony_city) : emptyToNull(body.contact_city),
    feeder_state: useColonyAddress ? emptyToNull(body.colony_state) : emptyToNull(body.contact_state),
    feeder_zip: useColonyAddress ? emptyToNull(body.colony_zip) : emptyToNull(body.contact_zip),
    feeder_county: useColonyAddress
      ? emptyToNull(body.colony_county)
      : emptyToNull(body.contact_county),
    ...(useColonyAddress && body.colony_lat != null && body.colony_lng != null
      ? { feeder_lat: body.colony_lat, feeder_lng: body.colony_lng }
      : {}),
  };
}

/** Fill blank feeder fields from the reporter when they said they feed the cats. */
export function applyReporterAsFeederIfNeeded<
  T extends IntakeFeederSource & Partial<IntakeFeederFields>,
>(record: T): T {
  const built = buildFeederFieldsFromIntake(record);
  if (!built) return record;

  return {
    ...record,
    feeder_name: emptyToNull(record.feeder_name) ?? built.feeder_name,
    feeder_phone: emptyToNull(record.feeder_phone) ?? built.feeder_phone,
    feeder_email: emptyToNull(record.feeder_email) ?? built.feeder_email,
    feeder_street: emptyToNull(record.feeder_street) ?? built.feeder_street,
    feeder_city: emptyToNull(record.feeder_city) ?? built.feeder_city,
    feeder_state: emptyToNull(record.feeder_state) ?? built.feeder_state,
    feeder_zip: emptyToNull(record.feeder_zip) ?? built.feeder_zip,
    feeder_county: emptyToNull(record.feeder_county) ?? built.feeder_county,
    feeder_lat: record.feeder_lat ?? built.feeder_lat ?? null,
    feeder_lng: record.feeder_lng ?? built.feeder_lng ?? null,
  };
}
