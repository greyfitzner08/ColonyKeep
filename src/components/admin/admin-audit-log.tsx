"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EASTERN_TIME_ZONE = "America/New_York";

function formatAuditWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("month")}/${part("day")}/${part("year")} ${part("hour")}:${part("minute")} ${part("dayPeriod")} (EST)`;
}

interface AuditEvent {
  id: string;
  occurred_at: string;
  actor_email: string | null;
  actor_name: string | null;
  method: string | null;
  path: string | null;
  summary: string;
  source: string;
  entity_type: string | null;
  entity_id: string | null;
}

function actorLabel(event: AuditEvent) {
  return event.actor_name?.trim() || event.actor_email?.trim() || "Unknown";
}

function sourceLabel(source: string) {
  if (source === "login") return "Sign-in";
  if (source === "api") return "App action";
  return source;
}

export function AdminAuditLog() {
  const [source, setSource] = useState("all");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (options: { before?: string | null; replace: boolean }) => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (source !== "all") params.set("source", source);
      if (appliedQuery) params.set("q", appliedQuery);
      if (options.before) params.set("before", options.before);

      try {
        const response = await fetch(`/api/admin/audit?${params.toString()}`);
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          setError(result?.error ?? "Unable to load the audit log.");
          return;
        }
        const page = (result?.events ?? []) as AuditEvent[];
        setEvents((current) => (options.replace ? page : [...current, ...page]));
        setNextBefore(typeof result?.nextBefore === "string" ? result.nextBefore : null);
      } catch {
        setError("Unable to load the audit log.");
      } finally {
        setLoading(false);
      }
    },
    [appliedQuery, source]
  );

  useEffect(() => {
    void load({ replace: true });
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Audit log</h2>
        <p className="text-sm text-muted-foreground">
          Admin-only record of sign-ins and changes made outside a case. Notes, claims, and other
          updates that already show on a case are not listed here. Page views are not included.
          Sign-ins already on record are the latest one saved for each person; new sign-ins are
          added as they happen.
        </p>
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setAppliedQuery(query.trim());
        }}
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search person or action"
          className="h-9 w-full sm:w-72"
          aria-label="Search audit log"
        />
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="h-9 w-full sm:w-44">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All activity</SelectItem>
            <SelectItem value="login">Sign-ins</SelectItem>
            <SelectItem value="api">App actions</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" variant="outline">
          Search
        </Button>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="min-w-0">
        <div className="divide-y rounded-lg border md:hidden">
          {events.map((event) => (
            <article key={event.id} className="space-y-1 px-3 py-3">
              <p className="text-xs text-muted-foreground">{formatAuditWhen(event.occurred_at)}</p>
              <p className="break-words font-medium">{actorLabel(event)}</p>
              <p className="break-words text-sm">{event.summary}</p>
              <p className="break-words text-xs text-muted-foreground">
                {sourceLabel(event.source)}
                {event.actor_name && event.actor_email ? ` · ${event.actor_email}` : ""}
              </p>
            </article>
          ))}
          {!loading && events.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No audit events match this view.
            </p>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto rounded-lg border md:block">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Who</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b last:border-b-0 align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {formatAuditWhen(event.occurred_at)}
                  </td>
                  <td className="px-3 py-2">
                    <p className="break-words">{actorLabel(event)}</p>
                    {event.actor_name && event.actor_email ? (
                      <p className="break-all text-xs text-muted-foreground">{event.actor_email}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 break-words">{event.summary}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {sourceLabel(event.source)}
                  </td>
                </tr>
              ))}
              {!loading && events.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                    No audit events match this view.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {nextBefore ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => void load({ before: nextBefore, replace: false })}
          >
            {loading ? "Loading…" : "Load older"}
          </Button>
        ) : null}
        {loading && events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading audit log…</p>
        ) : null}
      </div>
    </div>
  );
}
