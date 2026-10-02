/**
 * Read a Google Calendar secret iCal feed into signup rows.
 * The feed URL stays on the server. Event times are stored in America/New_York.
 */

import { sanitizeCalendarHtml } from "@/lib/shifts/calendar-html";

const DISPLAY_ZONE = "America/New_York";
const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

export interface GoogleCalendarSignupEvent {
  /** Stable id for one calendar occurrence. Recurring instances include the original date. */
  key: string;
  eventName: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string | null;
}

interface ParseWindow {
  from: Date;
  to: Date;
}

interface Prop {
  name: string;
  params: Record<string, string>;
  value: string;
}

interface WallDate {
  y: number;
  m: number;
  d: number;
}

interface WallTime {
  h: number;
  min: number;
  s: number;
}

interface TimedStamp {
  allDay: false;
  zone: string;
  date: WallDate;
  time: WallTime;
  instant: Date;
}

interface AllDayStamp {
  allDay: true;
  date: WallDate;
}

type Stamp = TimedStamp | AllDayStamp;

interface RawEvent {
  uid: string;
  props: Prop[];
}

interface RRule {
  freq: string;
  interval: number;
  count: number | null;
  until: string | null;
  byday: string[] | null;
  bymonthday: number | null;
  wkst: string;
}

/** Series id shared by a recurring event. One-off events use their own uid. */
export function googleCalendarSeriesId(uid: string | null | undefined): string | null {
  const trimmed = uid?.trim();
  if (!trimmed) return null;
  const pipe = trimmed.indexOf("|");
  const series = pipe === -1 ? trimmed : trimmed.slice(0, pipe);
  return series || null;
}

export function googleCalendarIcalUrl(): string | null {
  const raw = process.env.GOOGLE_CALENDAR_ICAL_URL?.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.hostname !== "calendar.google.com") return null;
  if (!url.pathname.includes("/ical/")) return null;
  return url.toString();
}

export function isGoogleCalendarSyncConfigured(): boolean {
  return googleCalendarIcalUrl() != null;
}

export function parseGoogleCalendarIcal(
  ics: string,
  window: ParseWindow
): GoogleCalendarSignupEvent[] {
  const blocks = eventBlocks(ics);
  const events = blocks
    .map(parseRawEvent)
    .filter((event): event is RawEvent => event != null);

  const grouped = new Map<string, RawEvent[]>();
  for (const event of events) {
    const list = grouped.get(event.uid) ?? [];
    list.push(event);
    grouped.set(event.uid, list);
  }

  const parsed: GoogleCalendarSignupEvent[] = [];
  for (const group of grouped.values()) {
    parsed.push(...expandGroup(group, window));
  }
  parsed.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  return parsed;
}

export async function fetchGoogleCalendarEvents(
  url: string,
  window: ParseWindow
): Promise<GoogleCalendarSignupEvent[]> {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "follow",
    headers: { Accept: "text/calendar, text/plain" },
  });
  if (!response.ok) {
    throw new Error(`Calendar feed responded ${response.status}`);
  }
  let finalHost = "";
  try {
    finalHost = new URL(response.url).hostname;
  } catch {
    finalHost = "";
  }
  if (finalHost && finalHost !== "calendar.google.com") {
    throw new Error("Calendar feed redirected away from Google Calendar");
  }
  const body = await response.text();
  if (body.length > 2_000_000) {
    throw new Error("Calendar feed is too large");
  }
  return parseGoogleCalendarIcal(body, window);
}

function eventBlocks(ics: string): string[] {
  const unfolded = ics.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "");
  const blocks: string[] = [];
  const re = /BEGIN:VEVENT\n([\s\S]*?)\nEND:VEVENT/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(unfolded))) {
    blocks.push(match[1]);
  }
  return blocks;
}

function parseRawEvent(block: string): RawEvent | null {
  const props = block
    .split("\n")
    .map(splitProperty)
    .filter((prop): prop is Prop => prop != null);
  const uid = firstValue(props, "UID")?.trim();
  if (!uid) return null;
  return { uid, props };
}

function splitProperty(line: string): Prop | null {
  if (!line) return null;
  let nameEnd = 0;
  while (nameEnd < line.length && line[nameEnd] !== ";" && line[nameEnd] !== ":") nameEnd += 1;
  const name = line.slice(0, nameEnd).toUpperCase();
  if (!name) return null;

  const params: Record<string, string> = {};
  let i = nameEnd;
  if (line[i] === ";") {
    i += 1;
    while (i < line.length && line[i] !== ":") {
      const keyStart = i;
      while (i < line.length && line[i] !== "=" && line[i] !== ";" && line[i] !== ":") i += 1;
      const key = line.slice(keyStart, i).toUpperCase();
      let val = "";
      if (line[i] === "=") {
        i += 1;
        if (line[i] === '"') {
          i += 1;
          const start = i;
          while (i < line.length && line[i] !== '"') i += 1;
          val = line.slice(start, i);
          if (line[i] === '"') i += 1;
        } else {
          const start = i;
          while (i < line.length && line[i] !== ";" && line[i] !== ":") i += 1;
          val = line.slice(start, i);
        }
      }
      if (key) params[key] = val;
      if (line[i] === ";") i += 1;
    }
  }
  if (line[i] !== ":") return null;
  return { name, params, value: unescapeIcal(line.slice(i + 1)) };
}

function unescapeIcal(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === "\\" && i + 1 < value.length) {
      const next = value[i + 1];
      if (next === "n" || next === "N") out += "\n";
      else if (next === "\\") out += "\\";
      else out += next;
      i += 1;
    } else {
      out += value[i];
    }
  }
  return out;
}

function expandGroup(group: RawEvent[], window: ParseWindow): GoogleCalendarSignupEvent[] {
  const master = group.find((event) => prop(event.props, "RECURRENCE-ID") == null) ?? null;
  const overrides = group.filter((event) => prop(event.props, "RECURRENCE-ID") != null);
  const source = master ?? overrides[0];
  if (!source) return [];
  if (cancelled(source.props) && overrides.length === 0) return [];

  const startProp = prop(source.props, "DTSTART");
  if (!startProp) return [];
  const start = parseStamp(startProp);
  if (!start) return [];

  const rule = master ? parseRrule(firstValue(master.props, "RRULE")) : null;
  const exdates = new Set(collectExdates(master?.props ?? source.props, start));
  const overrideByKey = new Map<string, RawEvent>();
  for (const override of overrides) {
    const recurrence = prop(override.props, "RECURRENCE-ID");
    if (!recurrence) continue;
    const stamp = parseStamp(recurrence);
    if (!stamp) continue;
    overrideByKey.set(occurrenceKey(stamp, start), override);
  }

  const occurrences = rule
    ? expandRule(start, rule, window, exdates)
    : start.allDay || inWindow(start.instant, window)
      ? [start]
      : [];

  const results: GoogleCalendarSignupEvent[] = [];
  const seen = new Set<string>();
  for (const occurrence of occurrences) {
    const occKey = occurrenceKey(occurrence, start);
    if (exdates.has(occKey)) continue;
    const override = overrideByKey.get(occKey);
    if (override && cancelled(override.props)) continue;
    const event = toSignupEvent(override ?? source, override ? null : occurrence, occurrence, start, Boolean(rule));
    if (!event || seen.has(event.key)) continue;
    if (!dateInWindow(event.date, window)) continue;
    seen.add(event.key);
    results.push(event);
  }

  for (const override of overrides) {
    if (cancelled(override.props)) continue;
    const recurrence = prop(override.props, "RECURRENCE-ID");
    const recurrenceStamp = recurrence ? parseStamp(recurrence) : null;
    const event = toSignupEvent(override, null, recurrenceStamp ?? start, start, true);
    if (!event || seen.has(event.key)) continue;
    if (!dateInWindow(event.date, window)) continue;
    seen.add(event.key);
    results.push(event);
  }

  return results;
}

function toSignupEvent(
  source: RawEvent,
  occurrence: Stamp | null,
  recurrenceStamp: Stamp,
  seriesStart: Stamp,
  recurring: boolean
): GoogleCalendarSignupEvent | null {
  const startProp = prop(source.props, "DTSTART");
  const endProp = prop(source.props, "DTEND");
  const start = occurrence ?? (startProp ? parseStamp(startProp) : null);
  if (!start) return null;
  const seriesEnd = endProp ? parseStamp(endProp) : null;
  const displayStart = displayParts(start);
  const displayEnd = endForOccurrence(startProp ? parseStamp(startProp) : null, seriesEnd, occurrence, start);
  const sameDay = displayEnd != null && displayEnd.date === displayStart.date;

  let endTime = displayStart.time;
  let endsNote: string | null = null;
  if (start.allDay) {
    endTime = "23:59:00";
    if (displayEnd) {
      const last = addDays(parseDateKey(displayEnd.date), -1);
      if (dateKey(last) !== displayStart.date) {
        endsNote = `Through ${dateKey(last)}`;
      }
    }
  } else if (displayEnd && sameDay) {
    endTime = displayEnd.time;
  } else if (displayEnd) {
    endTime = "23:59:00";
    endsNote = `Ends ${displayEnd.date} ${displayEnd.time.slice(0, 5)}`;
  } else {
    endTime = addHoursTime(displayStart.time, 1);
  }

  const summary = (firstValue(source.props, "SUMMARY") ?? "Untitled event").trim() || "Untitled event";
  const location = (firstValue(source.props, "LOCATION") ?? "").trim();
  const description = calendarDescription(source.props);
  const noteBody = endsNote
    ? description
      ? `${description}${looksLikeMarkup(description) ? `<p>${escapeNote(endsNote)}</p>` : `\n${endsNote}`}`
      : endsNote
    : description;
  const notes = noteBody ? limitNotes(noteBody) : null;
  const recurrenceKey = occurrenceKey(recurrenceStamp, seriesStart);
  const key = recurring ? `${source.uid}|${recurrenceKey}` : source.uid;

  return {
    key,
    eventName: summary.slice(0, 180),
    date: displayStart.date,
    startTime: start.allDay ? "00:00:00" : displayStart.time,
    endTime,
    location: location.slice(0, 300),
    notes: notes ? notes.slice(0, 1000) : null,
  };
}

function endForOccurrence(
  seriesStart: Stamp | null,
  seriesEnd: Stamp | null,
  occurrence: Stamp | null,
  displayStart: Stamp
): { date: string; time: string } | null {
  if (!seriesEnd) return null;
  if (occurrence && seriesStart && !seriesStart.allDay && !seriesEnd.allDay && !displayStart.allDay) {
    const duration = seriesEnd.instant.getTime() - seriesStart.instant.getTime();
    return formatInstant(new Date(displayStart.instant.getTime() + Math.max(0, duration)), DISPLAY_ZONE);
  }
  if (occurrence?.allDay && seriesStart?.allDay && seriesEnd.allDay) {
    return { date: dateKey(addDays(displayStart.date, daysBetween(seriesStart.date, seriesEnd.date))), time: "00:00:00" };
  }
  return displayParts(seriesEnd);
}

function daysBetween(a: WallDate, b: WallDate): number {
  const ms = Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d);
  return Math.round(ms / 86_400_000);
}

function parseDateKey(value: string): WallDate {
  const [y, m, d] = value.split("-").map(Number);
  return { y, m, d };
}

function expandRule(
  start: Stamp,
  rule: RRule,
  window: ParseWindow,
  exdates: Set<string>
): Stamp[] {
  if (start.allDay && rule.freq !== "DAILY" && rule.freq !== "WEEKLY" && rule.freq !== "MONTHLY" && rule.freq !== "YEARLY") {
    return [];
  }
  const until = rule.until ? parseUntil(rule.until, start) : window.to;
  const out: Stamp[] = [];
  let produced = 0;
  const limit = rule.count ?? 400;

  const emit = (stamp: Stamp) => {
    if (produced >= limit) return false;
    produced += 1;
    const instant = stamp.allDay ? wallToInstant(stamp.date, { h: 12, min: 0, s: 0 }, DISPLAY_ZONE) : stamp.instant;
    if (until && instant.getTime() > until.getTime()) return false;
    if (exdates.has(occurrenceKey(stamp, start))) {
      return produced < limit;
    }
    if (instant.getTime() >= window.from.getTime() && instant.getTime() <= window.to.getTime()) {
      out.push(stamp);
    }
    return produced < limit;
  };

  if (rule.freq === "DAILY") {
    let cursor = start.date;
    for (let step = 0; step < 3000 && produced < limit; step += 1) {
      const stamp = stampOnDate(start, cursor);
      if (!emit(stamp)) break;
      cursor = addDays(cursor, rule.interval);
      if (cursorAfterUntil(cursor, until, start)) break;
    }
    return out;
  }

  if (rule.freq === "WEEKLY") {
    const days = (rule.byday ?? [weekdayCode(start.date)]).map(dayCode);
    const wkst = dayCode(rule.wkst);
    let week = startOfWeek(start.date, wkst);
    for (let weekIndex = 0; weekIndex < 3000 && produced < limit; weekIndex += 1) {
      if (weekIndex % rule.interval === 0) {
        for (const day of days) {
          const date = addDays(week, (day - wkst + 7) % 7);
          if (compareDate(date, start.date) < 0) continue;
          const stamp = stampOnDate(start, date);
          if (!emit(stamp)) return out;
        }
      }
      week = addDays(week, 7);
      if (cursorAfterUntil(week, until, start)) break;
    }
    return out;
  }

  if (rule.freq === "MONTHLY" || rule.freq === "YEARLY") {
    let cursor = start.date;
    for (let step = 0; step < 600 && produced < limit; step += 1) {
      const dates = rule.freq === "YEARLY" ? yearlyDates(cursor, rule, start) : monthlyDates(cursor, rule, start);
      for (const date of dates) {
        if (compareDate(date, start.date) < 0) continue;
        const stamp = stampOnDate(start, date);
        if (!emit(stamp)) return out;
      }
      cursor = rule.freq === "YEARLY"
        ? { y: cursor.y + rule.interval, m: cursor.m, d: 1 }
        : addMonths(cursor, rule.interval);
      if (cursorAfterUntil(cursor, until, start)) break;
    }
    return out;
  }

  if (inWindow(start.allDay ? wallToInstant(start.date, { h: 12, min: 0, s: 0 }, DISPLAY_ZONE) : start.instant, window)) {
    return [start];
  }
  return [];
}

function monthlyDates(month: WallDate, rule: RRule, start: Stamp): WallDate[] {
  if (rule.byday && rule.byday.length > 0) {
    return rule.byday
      .map((token) => nthWeekdayOfMonth(month.y, month.m, token))
      .filter((date): date is WallDate => date != null);
  }
  const day = rule.bymonthday ?? start.date.d;
  return [{ y: month.y, m: month.m, d: Math.min(day, daysInMonth(month.y, month.m)) }];
}

function yearlyDates(cursor: WallDate, rule: RRule, start: Stamp): WallDate[] {
  const month = start.date.m;
  if (rule.byday && rule.byday.length > 0) {
    return rule.byday
      .map((token) => nthWeekdayOfMonth(cursor.y, month, token))
      .filter((date): date is WallDate => date != null);
  }
  const day = Math.min(start.date.d, daysInMonth(cursor.y, month));
  return [{ y: cursor.y, m: month, d: day }];
}

function stampOnDate(start: Stamp, date: WallDate): Stamp {
  if (start.allDay) return { allDay: true, date };
  return {
    allDay: false,
    zone: start.zone,
    date,
    time: start.time,
    instant: wallToInstant(date, start.time, start.zone),
  };
}

function occurrenceKey(stamp: Stamp, seriesStart: Stamp): string {
  if (stamp.allDay || seriesStart.allDay) return dateKey(stamp.date);
  const zone = seriesStart.allDay ? DISPLAY_ZONE : seriesStart.zone;
  const formatted = formatInstant(stamp.instant, zone);
  return `${formatted.date}T${formatted.time.replace(/:/g, "")}`;
}

function collectExdates(props: Prop[], start: Stamp): string[] {
  const keys: string[] = [];
  for (const item of props) {
    if (item.name !== "EXDATE") continue;
    for (const value of item.value.split(",")) {
      const stamp = parseStamp({ name: "EXDATE", params: item.params, value: value.trim() });
      if (stamp) keys.push(occurrenceKey(stamp, start));
    }
  }
  return keys;
}

function parseRrule(value: string | null): RRule | null {
  if (!value) return null;
  const bag: Record<string, string> = {};
  for (const part of value.split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    bag[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1);
  }
  if (!bag.FREQ) return null;
  return {
    freq: bag.FREQ.toUpperCase(),
    interval: Math.max(1, Number(bag.INTERVAL) || 1),
    count: bag.COUNT ? Math.max(1, Number(bag.COUNT) || 1) : null,
    until: bag.UNTIL ?? null,
    byday: bag.BYDAY ? bag.BYDAY.split(",").filter(Boolean) : null,
    bymonthday: bag.BYMONTHDAY ? Number(bag.BYMONTHDAY.split(",")[0]) || null : null,
    wkst: (bag.WKST ?? "SU").toUpperCase(),
  };
}

function parseUntil(value: string, start: Stamp): Date | null {
  const stamp = parseStamp({
    name: "UNTIL",
    params: value.endsWith("Z") ? {} : { TZID: start.allDay ? DISPLAY_ZONE : start.zone },
    value,
  });
  if (!stamp) return null;
  return stamp.allDay ? wallToInstant(stamp.date, { h: 23, min: 59, s: 59 }, DISPLAY_ZONE) : stamp.instant;
}

function parseStamp(propValue: Prop): Stamp | null {
  const value = propValue.value.trim();
  const dateOnly = propValue.params.VALUE === "DATE" || /^\d{8}$/.test(value);
  const dateMatch = /^(\d{4})(\d{2})(\d{2})/.exec(value);
  if (!dateMatch) return null;
  const date = { y: Number(dateMatch[1]), m: Number(dateMatch[2]), d: Number(dateMatch[3]) };
  if (dateOnly) return { allDay: true, date };

  const timeMatch = /T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(value);
  if (!timeMatch) return null;
  const time = { h: Number(timeMatch[1]), min: Number(timeMatch[2]), s: Number(timeMatch[3]) };
  const zone = timeMatch[4] === "Z" ? "UTC" : propValue.params.TZID || DISPLAY_ZONE;
  return {
    allDay: false,
    zone,
    date,
    time,
    instant: wallToInstant(date, time, zone),
  };
}

function displayParts(stamp: Stamp): { date: string; time: string } {
  if (stamp.allDay) return { date: dateKey(stamp.date), time: "00:00:00" };
  return formatInstant(stamp.instant, DISPLAY_ZONE);
}

function formatInstant(instant: Date, timeZone: string): { date: string; time: string } {
  const parts = partsInZone(instant, timeZone);
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${hour}:${parts.minute}:${parts.second}`,
  };
}

function partsInZone(instant: Date, timeZone: string): Record<string, string> {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const bag: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  return bag;
}

function wallToInstant(date: WallDate, time: WallTime, timeZone: string): Date {
  const utcGuess = Date.UTC(date.y, date.m - 1, date.d, time.h, time.min, time.s);
  let utc = utcGuess;
  for (let i = 0; i < 3; i += 1) {
    const offset = zoneOffsetMs(new Date(utc), timeZone);
    const next = utcGuess - offset;
    if (next === utc) break;
    utc = next;
  }
  return new Date(utc);
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = partsInZone(instant, timeZone);
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - instant.getTime();
}

function dateInWindow(date: string, window: ParseWindow): boolean {
  const from = formatInstant(window.from, DISPLAY_ZONE).date;
  const to = formatInstant(window.to, DISPLAY_ZONE).date;
  return date >= from && date <= to;
}

function inWindow(instant: Date, window: ParseWindow): boolean {
  return instant.getTime() >= window.from.getTime() && instant.getTime() <= window.to.getTime();
}

function cursorAfterUntil(cursor: WallDate, until: Date | null, start: Stamp): boolean {
  if (!until) return false;
  const instant = start.allDay
    ? wallToInstant(cursor, { h: 0, min: 0, s: 0 }, DISPLAY_ZONE)
    : wallToInstant(cursor, start.time, start.zone);
  return instant.getTime() > until.getTime();
}

function nthWeekdayOfMonth(year: number, month: number, token: string): WallDate | null {
  const match = /^([+-]?\d)?([A-Z]{2})$/.exec(token.toUpperCase());
  if (!match) return null;
  const day = dayCode(match[2]);
  const ordinal = match[1] ? Number(match[1]) : 1;
  if (ordinal > 0) {
    let cursor = { y: year, m: month, d: 1 };
    while (cursor.m === month && weekdayIndex(cursor) !== day) cursor = addDays(cursor, 1);
    cursor = addDays(cursor, (ordinal - 1) * 7);
    return cursor.m === month ? cursor : null;
  }
  let cursor = { y: year, m: month, d: daysInMonth(year, month) };
  while (cursor.m === month && weekdayIndex(cursor) !== day) cursor = addDays(cursor, -1);
  cursor = addDays(cursor, (ordinal + 1) * 7);
  return cursor.m === month ? cursor : null;
}

function startOfWeek(date: WallDate, wkst: number): WallDate {
  const delta = (weekdayIndex(date) - wkst + 7) % 7;
  return addDays(date, -delta);
}

function weekdayCode(date: WallDate): string {
  return WEEKDAYS[weekdayIndex(date)];
}

function dayCode(token: string): number {
  const code = token.toUpperCase().slice(-2);
  const index = WEEKDAYS.indexOf(code as (typeof WEEKDAYS)[number]);
  return index >= 0 ? index : 0;
}

function weekdayIndex(date: WallDate): number {
  return new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay();
}

function addDays(date: WallDate, days: number): WallDate {
  const next = new Date(Date.UTC(date.y, date.m - 1, date.d + days));
  return { y: next.getUTCFullYear(), m: next.getUTCMonth() + 1, d: next.getUTCDate() };
}

function addMonths(date: WallDate, months: number): WallDate {
  const monthIndex = date.m - 1 + months;
  const year = date.y + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  return { y: year, m: month + 1, d: 1 };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function compareDate(a: WallDate, b: WallDate): number {
  return dateKey(a).localeCompare(dateKey(b));
}

function dateKey(date: WallDate): string {
  return `${date.y}-${pad(date.m)}-${pad(date.d)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function addHoursTime(time: string, hours: number): string {
  const [h, min, s] = time.split(":").map(Number);
  const next = (h + hours) % 24;
  return `${pad(next)}:${pad(min)}:${pad(s || 0)}`;
}

function calendarDescription(props: Prop[]): string {
  const plain = sanitizeCalendarHtml(firstValue(props, "DESCRIPTION") ?? "");
  const alt = props.find(
    (item) => item.name === "X-ALT-DESC" && /html/i.test(item.params.FMTTYPE ?? "")
  );
  const altAny = props.find((item) => item.name === "X-ALT-DESC");
  const html = sanitizeCalendarHtml((alt ?? altAny)?.value ?? "");
  if (!html) return plain;
  if (!plain) return html;
  // Google's HTML copy can lag behind the description field you edit.
  if (comparableText(html) === comparableText(plain)) return html;
  return plain;
}

function comparableText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function looksLikeMarkup(value: string): boolean {
  return /<\/?[a-z][a-z0-9]*\b/i.test(value);
}

function escapeNote(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function limitNotes(value: string): string {
  if (value.length <= 4000) return value;
  const cut = value.slice(0, 4000);
  const lastTag = cut.lastIndexOf(">");
  return (lastTag > 0 ? cut.slice(0, lastTag + 1) : cut).trim();
}

function cancelled(props: Prop[]): boolean {
  return (firstValue(props, "STATUS") ?? "").toUpperCase() === "CANCELLED";
}

function firstValue(props: Prop[], name: string): string | null {
  return prop(props, name)?.value ?? null;
}

function prop(props: Prop[], name: string): Prop | null {
  return props.find((item) => item.name === name) ?? null;
}
