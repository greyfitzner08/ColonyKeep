"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Cat, CheckCircle, AlertTriangle, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventDetailsSummary } from "@/components/clinics/event-details-summary";
import { ClinicBookingCatFields } from "@/components/clinics/clinic-booking-cat-fields";
import { SpotsLeftCounter } from "@/components/clinics/spots-left-counter";
import {
  calculateBookingTotal,
  getAddonOptions,
  normalizeServiceCatalog,
} from "@/lib/clinics/service-catalog";
import type { PublicClinicEvent } from "@/lib/types";
import { isEventPastDate } from "@/lib/clinic-events/visibility";
import { clinicHoldMinutes } from "@/lib/clinic-events/hold-duration";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface SpotForm {
  cat_name: string;
  cat_colors: string;
  cat_gender: string;
  has_injuries: boolean;
  injury_details: string;
  has_notes: boolean;
  selected_addons: string[];
  notes: string;
}

const emptySpot = (): SpotForm => ({
  cat_name: "",
  cat_colors: "",
  cat_gender: "",
  has_injuries: false,
  injury_details: "",
  has_notes: false,
  selected_addons: [],
  notes: "",
});

type BookingSection = "count" | "contact" | "cats";

function BookingAccordionSection({
  stepLabel,
  title,
  summary,
  open,
  locked,
  onSelect,
  children,
}: {
  stepLabel: string;
  title: string;
  summary?: string;
  open: boolean;
  locked: boolean;
  onSelect: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Card className={locked ? "opacity-70" : undefined}>
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3 text-left disabled:cursor-not-allowed"
        disabled={locked}
        onClick={onSelect}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-xs uppercase tracking-wide text-muted-foreground">{stepLabel}</span>
          <span className="font-semibold">{title}</span>
          {summary && !open && (
            <span className="mt-0.5 block truncate text-sm text-muted-foreground">{summary}</span>
          )}
          {locked && (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Finish the previous section first
            </span>
          )}
        </span>
      </button>
      {open && !locked && <div className="border-t px-4 py-4">{children}</div>}
    </Card>
  );
}

const DEFAULT_PENDING_MESSAGE =
  "We received your request and will review it shortly. Your spot is not confirmed until you receive a confirmation email from our team.";

function ClinicBookingContent() {
  const searchParams = useSearchParams();
  const eventFilter = searchParams.get("event");

  const [events, setEvents] = useState<PublicClinicEvent[]>([]);
  const [available, setAvailable] = useState<Record<string, number>>({});
  const [selectedEvent, setSelectedEvent] = useState<PublicClinicEvent | null>(null);
  /** Empty string while typing so users can clear and enter a new number. */
  const [spotCount, setSpotCount] = useState<number | "">(1);
  const [holdSessionId, setHoldSessionId] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [section, setSection] = useState<BookingSection>("count");
  const [contactConfirmed, setContactConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [holding, setHolding] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [contact, setContact] = useState({
    contact_name: "",
    contact_email: "",
    contact_phone: "",
  });
  const [spots, setSpots] = useState<SpotForm[]>([emptySpot()]);
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set([0]));

  const releaseHold = useCallback(async (sessionId: string) => {
    await fetch("/api/clinic-booking/release-hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    }).catch(() => null);
  }, []);

  const refreshAvailability = useCallback(async () => {
    const url = eventFilter
      ? `/api/clinic-booking/events?eventId=${eventFilter}`
      : "/api/clinic-booking/events";
    const response = await fetch(url);
    const result = await response.json().catch(() => null);
    if (response.ok) {
      setAvailable(result.available ?? {});
      if (result.events) setEvents(result.events);
    }
  }, [eventFilter]);

  useEffect(() => {
    const url = eventFilter
      ? `/api/clinic-booking/events?eventId=${eventFilter}`
      : "/api/clinic-booking/events";
    fetch(url)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result?.error ?? "Unable to load clinic events");
        }
        const loaded = result.events as PublicClinicEvent[];
        setEvents(loaded);
        setAvailable(result.available ?? {});
        if (eventFilter && loaded.length === 1) {
          setSelectedEvent(loaded[0]);
        }
      })
      .catch((error) => setLoadError(error.message));
  }, [eventFilter]);

  useEffect(() => {
    if (!holdExpiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(holdExpiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && holdSessionId) {
        setSubmitError("Your hold expired. Please start again.");
        releaseHold(holdSessionId);
        setHoldSessionId(null);
        setHoldExpiresAt(null);
        setSection("count");
        setContactConfirmed(false);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt, holdSessionId, releaseHold]);

  useEffect(() => {
    return () => {
      if (holdSessionId && !submitted) {
        releaseHold(holdSessionId);
      }
    };
  }, [holdSessionId, submitted, releaseHold]);

  function getEventCatalog(event: PublicClinicEvent) {
    return normalizeServiceCatalog(
      event.service_catalog,
      event.included_services,
      event.addon_services
    );
  }

  function calculateSpotTotal(spot: SpotForm): number {
    if (!selectedEvent) return 0;
    return calculateBookingTotal(
      selectedEvent.base_price,
      getEventCatalog(selectedEvent),
      spot.selected_addons
    );
  }

  function calculateGrandTotal(): number {
    return spots.reduce((sum, spot) => sum + calculateSpotTotal(spot), 0);
  }

  function patchSpot(index: number, patch: Partial<SpotForm>) {
    setSpots((current) => current.map((spot, i) => (i === index ? { ...spot, ...patch } : spot)));
  }

  function maxSpotRequest(event: PublicClinicEvent) {
    return Math.min(20, available[event.id] ?? event.total_spots);
  }

  function parsedSpotCount(): number | null {
    if (spotCount === "") return null;
    return spotCount;
  }

  async function startHold() {
    if (!selectedEvent) return;
    setSubmitError(null);
    const max = maxSpotRequest(selectedEvent);
    const count = parsedSpotCount();
    if (count == null || count < 1) {
      setSubmitError("Enter how many cats you need spots for.");
      return;
    }
    const spot_count = Math.min(count, max);
    if (spot_count !== count) setSpotCount(spot_count);

    setHolding(true);
    if (holdSessionId) {
      await releaseHold(holdSessionId);
      setHoldSessionId(null);
      setHoldExpiresAt(null);
    }
    const response = await fetch("/api/clinic-booking/hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: selectedEvent.id, spot_count }),
    });
    const result = await response.json().catch(() => null);
    setHolding(false);

    if (!response.ok) {
      setSubmitError(result?.error ?? "Unable to hold spots");
      return;
    }

    setHoldSessionId(result.session_id);
    setHoldExpiresAt(result.expires_at);
    const nextSpots = Array.from({ length: result.spot_count }, () => emptySpot());
    setSpots(nextSpots);
    setExpandedCats(new Set([0]));
    setContactConfirmed(false);
    setSection("contact");
  }

  async function handleSubmit() {
    if (!selectedEvent || !holdSessionId) return;
    setSubmitError(null);
    if (spots.some((spot) => !spot.cat_name.trim())) {
      setSubmitError("Each cat needs a name.");
      return;
    }
    if (spots.some((spot) => !spot.cat_gender)) {
      setSubmitError("Select Male, Female, or Unknown for each cat.");
      return;
    }
    setSubmitting(true);

    const response = await fetch("/api/clinic-booking/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: holdSessionId,
        spots: spots.map((spot) => ({
          ...contact,
          ...spot,
          notes: spot.has_notes ? spot.notes : "",
          total_price: calculateSpotTotal(spot),
        })),
      }),
    });
    const result = await response.json().catch(() => null);
    setSubmitting(false);

    if (!response.ok) {
      setSubmitError(result?.error ?? "Unable to submit booking");
      return;
    }

    setSubmitted(true);
    setHoldSessionId(null);
  }

  function contactReady() {
    return Boolean(
      contact.contact_name.trim() && contact.contact_email.trim() && contact.contact_phone.trim()
    );
  }

  function spotReady(spot: SpotForm) {
    return Boolean(spot.cat_name.trim() && spot.cat_gender);
  }

  function openSection(next: BookingSection) {
    if (next === "contact" && !holdSessionId) return;
    if (next === "cats" && (!holdSessionId || !contactConfirmed)) return;
    setSection(next);
    setSubmitError(null);
  }

  function openCat(index: number) {
    if (index > 0 && !spots.slice(0, index).every(spotReady)) return;
    setExpandedCats(new Set([index]));
  }

  async function cancelBooking() {
    if (holdSessionId) await releaseHold(holdSessionId);
    setHoldSessionId(null);
    setHoldExpiresAt(null);
    setSecondsLeft(0);
    setSection("count");
    setContactConfirmed(false);
    setSelectedEvent(null);
    setSubmitError(null);
    await refreshAvailability();
  }

  const pendingMessage =
    selectedEvent?.pending_email_message?.trim() || DEFAULT_PENDING_MESSAGE;

  if (submitted && selectedEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle>Request submitted — not confirmed yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              role="alert"
              className="rounded-lg border-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm"
            >
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-950">
                    Your spot is NOT confirmed until you receive a confirmation email
                  </p>
                  <p className="mt-1 text-amber-900/90">
                    We received your request for {spots.length} cat
                    {spots.length === 1 ? "" : "s"}. Our team will review it and email you at{" "}
                    <strong>{contact.contact_email}</strong> when your spot is approved.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pendingMessage}</p>

            {selectedEvent.payment_url && (
              <div className="rounded-lg border-2 border-primary bg-primary/10 px-4 py-4 text-center space-y-3">
                <div>
                  <p className="text-lg font-semibold">Payment</p>
                  <p className="mt-1 text-sm">
                    When your spot is confirmed, complete payment through our Givebutter campaign.
                  </p>
                </div>
                <Button asChild className="w-full sm:w-auto" size="lg">
                  <a
                    href={selectedEvent.payment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open payment page
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-primary mb-4">
            <Cat className="h-8 w-8" />
            <span className="text-xl font-semibold">TNVR Rescue</span>
          </Link>
          <h1 className="text-2xl font-bold">Book a Clinic Spot</h1>
          <p className="text-muted-foreground mt-1">Request a spot at an upcoming TNVR clinic</p>
        </div>

        {!selectedEvent ? (
          <div className="grid gap-4">
            {loadError && (
              <Card><CardContent className="py-8 text-center text-destructive">{loadError}</CardContent></Card>
            )}
            {events.length === 0 && !loadError && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {eventFilter
                    ? "This clinic event is not available for booking. It may have been deactivated."
                    : "No clinic events are open for booking right now."}
                </CardContent>
              </Card>
            )}
            {events.length > 0 && (
              <div
                role="alert"
                className="flex gap-2 rounded-md border border-amber-400/80 bg-amber-50 px-3 py-2 text-sm text-amber-950"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p>
                  <span className="font-semibold">Cats must already be in a trap. </span>
                  Only claim a spot once you for certain have them secured. No-shows lose future
                  clinic privileges.
                </p>
              </div>
            )}
            {events.map((event) => {
              const remaining = available[event.id] ?? event.total_spots;
              const pastDate = isEventPastDate(event.date);
              return (
                <Card
                  key={event.id}
                  className={remaining <= 0 ? "opacity-60" : "cursor-pointer hover:shadow-md transition-shadow"}
                  onClick={() => {
                    if (remaining <= 0) return;
                    setSection("count");
                    setContactConfirmed(false);
                    setSelectedEvent(event);
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-lg">{event.title}</CardTitle>
                        <CardDescription className="mt-1">{event.clinic_name}</CardDescription>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <SpotsLeftCounter remaining={remaining} />
                        {pastDate && (
                          <Badge variant="outline" className="text-xs">
                            Past event date
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <EventDetailsSummary
                      event={event}
                      checkInDetails={event.check_in_details}
                      hideTitle
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <Button variant="outline" size="sm" onClick={() => void cancelBooking()}>
                Choose a different clinic
              </Button>
              {secondsLeft > 0 && (
                <Badge variant="destructive" className="shrink-0 text-sm px-3 py-1">
                  {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")} left
                </Badge>
              )}
            </div>

            <EventDetailsSummary
              event={selectedEvent}
              checkInDetails={selectedEvent.check_in_details}
              spotsAvailable={available[selectedEvent.id] ?? selectedEvent.total_spots}
              showTimeLimit
              holdMinutes={clinicHoldMinutes(
                typeof spotCount === "number" ? spotCount : spots.length || 1
              )}
              showTrapReadyWarning
              collapsible={Boolean(holdSessionId)}
              defaultExpanded={!holdSessionId}
            />

            <BookingAccordionSection
              stepLabel="Step 1"
              title="How many cats?"
              summary={
                typeof spotCount === "number"
                  ? `${spotCount} cat${spotCount === 1 ? "" : "s"}`
                  : undefined
              }
              open={section === "count"}
              locked={false}
              onSelect={() => openSection("count")}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="spot-count">Number of spots to request</Label>
                  <NumberInput
                    id="spot-count"
                    integer
                    min={1}
                    max={maxSpotRequest(selectedEvent)}
                    emptyValue={1}
                    value={spotCount}
                    onValueChange={setSpotCount}
                  />
                </div>
                {section === "count" && submitError && (
                  <p className="text-sm text-destructive">{submitError}</p>
                )}
                <div className="flex justify-end">
                  <Button
                    onClick={() => void startHold()}
                    disabled={holding || spotCount === "" || spotCount < 1}
                  >
                    {holding
                      ? "Starting…"
                      : spotCount === "" || spotCount < 1
                        ? "Continue"
                        : `Continue (${spotCount} spot${spotCount === 1 ? "" : "s"})`}
                  </Button>
                </div>
              </div>
            </BookingAccordionSection>

            <BookingAccordionSection
              stepLabel="Step 2"
              title="Your contact information"
              summary={
                contactConfirmed && contact.contact_name
                  ? contact.contact_name
                  : undefined
              }
              open={section === "contact"}
              locked={!holdSessionId}
              onSelect={() => openSection("contact")}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Name</Label>
                    <Input
                      id="contact-name"
                      value={contact.contact_name}
                      onChange={(e) => setContact({ ...contact, contact_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={contact.contact_email}
                      onChange={(e) => setContact({ ...contact, contact_email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    value={contact.contact_phone}
                    onChange={(e) => setContact({ ...contact, contact_phone: e.target.value })}
                    required
                  />
                </div>
                {section === "contact" && submitError && (
                  <p className="text-sm text-destructive">{submitError}</p>
                )}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => openSection("count")}>
                    Back
                  </Button>
                  <Button
                    disabled={!contactReady()}
                    onClick={() => {
                      setContactConfirmed(true);
                      setExpandedCats(new Set([0]));
                      openSection("cats");
                    }}
                  >
                    Continue to cat details
                  </Button>
                </div>
              </div>
            </BookingAccordionSection>

            <BookingAccordionSection
              stepLabel="Step 3"
              title="Cat details"
              summary={
                contactConfirmed
                  ? `${spots.length} cat${spots.length === 1 ? "" : "s"}`
                  : undefined
              }
              open={section === "cats"}
              locked={!holdSessionId || !contactConfirmed}
              onSelect={() => openSection("cats")}
            >
              <div className="space-y-4">
                {spots.map((spot, index) => {
                  const expanded = expandedCats.has(index);
                  const lockedCat = index > 0 && !spots.slice(0, index).every(spotReady);
                  const summaryBits = [
                    spot.cat_name.trim() || "Needs a name",
                    spot.cat_gender || "Gender not selected",
                  ];
                  return (
                    <div key={index} className={`rounded-lg border ${lockedCat ? "opacity-70" : ""}`}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-3 text-left disabled:cursor-not-allowed"
                        disabled={lockedCat}
                        onClick={() => openCat(index)}
                        aria-expanded={expanded}
                      >
                        {expanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold">Cat {index + 1} of {spots.length}</span>
                          {!expanded && (
                            <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                              {lockedCat ? "Finish the previous cat first" : summaryBits.join(" · ")}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-sm text-muted-foreground">
                          {formatCurrency(calculateSpotTotal(spot))}
                        </span>
                      </button>
                      {expanded && !lockedCat && (
                        <div className="space-y-4 border-t p-4">
                          <ClinicBookingCatFields
                            index={index}
                            spot={spot}
                            addons={getAddonOptions(getEventCatalog(selectedEvent))}
                            total={calculateSpotTotal(spot)}
                            onPatch={(patch) => patchSpot(index, patch)}
                          />
                          <div className="flex justify-end">
                            {index < spots.length - 1 ? (
                              <Button
                                disabled={!spotReady(spot)}
                                onClick={() => openCat(index + 1)}
                              >
                                Continue to cat {index + 2}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="rounded-lg bg-muted p-4">
                  <p className="font-semibold">Estimated grand total: {formatCurrency(calculateGrandTotal())}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Base price plus any selected add-ons. Payment may be collected separately.
                  </p>
                </div>
                <div
                  role="alert"
                  className="rounded-lg border-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                >
                  <p className="font-semibold">
                    Cats must already be in a trap before you claim a spot
                  </p>
                  <p className="mt-1">
                    Only submit once you for certain have the cat(s) secured in a humane trap.
                    Claiming a spot and not showing up will revoke privileges to use future
                    clinic appointments.
                  </p>
                </div>
                {section === "cats" && submitError && (
                  <p className="text-sm text-destructive">{submitError}</p>
                )}
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => openSection("contact")}>
                    Back
                  </Button>
                  <Button
                    onClick={() => void handleSubmit()}
                    disabled={submitting || spots.some((spot) => !spotReady(spot))}
                  >
                    {submitting
                      ? "Submitting…"
                      : `Submit request (${spots.length} cat${spots.length === 1 ? "" : "s"})`}
                  </Button>
                </div>
              </div>
            </BookingAccordionSection>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClinicBookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <ClinicBookingContent />
    </Suspense>
  );
}
