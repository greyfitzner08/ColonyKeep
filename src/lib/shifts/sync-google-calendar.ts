import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchGoogleCalendarEvents,
  googleCalendarIcalUrl,
  type GoogleCalendarSignupEvent,
} from "@/lib/shifts/google-calendar-ical";

const CACHE_OK_MS = 5 * 60 * 1000;
const CACHE_FAIL_MS = 30 * 1000;

let cache: {
  url: string;
  at: number;
  events: GoogleCalendarSignupEvent[] | null;
  error: string | null;
} | null = null;

interface ExistingShift {
  id: string;
  google_calendar_uid: string | null;
  event_name: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  signed_up_emails: string[] | null;
  waitlist_emails: string[] | null;
  declined_emails: string[] | null;
}

/** Pull Google events into shift rows. Signup lists already on a row are left in place. */
export async function syncGoogleCalendarShifts(service: SupabaseClient): Promise<void> {
  const url = googleCalendarIcalUrl();
  if (!url) return;

  const now = Date.now();
  const from = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const to = new Date(now + 120 * 24 * 60 * 60 * 1000);
  const events = await loadEvents(url, from, to);

  const fromDate = formatDate(from);
  const toDate = formatDate(to);
  const { data, error } = await service
    .from("shifts")
    .select(
      "id, google_calendar_uid, event_name, date, start_time, end_time, location, signed_up_emails, waitlist_emails, declined_emails"
    )
    .not("google_calendar_uid", "is", null)
    .gte("date", fromDate)
    .lte("date", toDate);

  if (error) throw new Error(error.message);

  const existing = (data ?? []) as ExistingShift[];
  const byUid = new Map(
    existing
      .filter((row) => row.google_calendar_uid)
      .map((row) => [row.google_calendar_uid as string, row])
  );
  const seen = new Set<string>();

  const inserts: Record<string, unknown>[] = [];
  for (const event of events) {
    seen.add(event.key);
    const row = byUid.get(event.key);
    if (!row) {
      inserts.push({
        google_calendar_uid: event.key,
        event_name: event.eventName,
        position_name: "Volunteer",
        shift_type: "event",
        required_roles: "any",
        signup_mode: "attendance",
        date: event.date,
        start_time: event.startTime,
        end_time: event.endTime,
        location: event.location,
        volunteers_needed: 0,
        notes: event.notes,
        team_ids: [],
        signed_up_emails: [],
        waitlist_emails: [],
        declined_emails: [],
      });
      continue;
    }

    const changed =
      row.event_name !== event.eventName ||
      row.date !== event.date ||
      normalizeTime(row.start_time) !== event.startTime ||
      normalizeTime(row.end_time) !== event.endTime ||
      row.location !== event.location;
    if (!changed) continue;

    const { error: updateError } = await service
      .from("shifts")
      .update({
        event_name: event.eventName,
        date: event.date,
        start_time: event.startTime,
        end_time: event.endTime,
        location: event.location,
      })
      .eq("id", row.id);
    if (updateError) throw new Error(updateError.message);
  }

  if (inserts.length > 0) {
    const { error: insertError } = await service.from("shifts").insert(inserts);
    if (insertError && !/duplicate|unique/i.test(insertError.message)) {
      throw new Error(insertError.message);
    }
  }

  const staleIds = existing
    .filter((row) => row.google_calendar_uid && !seen.has(row.google_calendar_uid))
    .filter((row) => emptyRoster(row))
    .map((row) => row.id);

  if (staleIds.length > 0) {
    const { error: deleteError } = await service.from("shifts").delete().in("id", staleIds);
    if (deleteError) throw new Error(deleteError.message);
  }
}

async function loadEvents(url: string, from: Date, to: Date): Promise<GoogleCalendarSignupEvent[]> {
  const now = Date.now();
  if (cache && cache.url === url) {
    const age = now - cache.at;
    if (cache.events && age < CACHE_OK_MS) return cache.events;
    if (cache.error && age < CACHE_FAIL_MS) throw new Error(cache.error);
  }

  try {
    const events = await fetchGoogleCalendarEvents(url, { from, to });
    cache = { url, at: now, events, error: null };
    return events;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Calendar sync failed";
    const safe = /calendar\.google\.com|private-/i.test(message) ? "Calendar sync failed" : message;
    cache = { url, at: now, events: null, error: safe };
    throw new Error(safe);
  }
}

function emptyRoster(row: ExistingShift): boolean {
  return (
    (row.signed_up_emails ?? []).length === 0 &&
    (row.waitlist_emails ?? []).length === 0 &&
    (row.declined_emails ?? []).length === 0
  );
}

function normalizeTime(value: string): string {
  const [h = "00", m = "00", s = "00"] = value.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:${(s || "00").padStart(2, "0")}`;
}

function formatDate(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const bag: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  return `${bag.year}-${bag.month}-${bag.day}`;
}
