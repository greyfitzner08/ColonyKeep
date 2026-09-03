"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, AlertTriangle, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { BrandMark } from "@/components/branding/brand-mark";
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
  getAddonOptions,
  normalizeServiceCatalog,
} from "@/lib/clinics/service-catalog";
import {
  calculateBookingGrandTotal,
  calculateSpotTotals,
  normalizePricingMode,
  pricingSummaryLabel,
  resolvePackagePrice,
} from "@/lib/clinics/event-pricing";
import type { PublicClinicEvent } from "@/lib/types";
import { isEventPastDate } from "@/lib/clinic-events/visibility";
import { clinicHoldMinutes, CLINIC_HOLD_EXTENSION_MINUTES, CLINIC_HOLD_MAX_EXTENSIONS } from "@/lib/clinic-events/hold-duration";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface SpotForm {
  cat_name: string;
  cat_colors: string;
  cat_gender: string;
  has_injuries: boolean;
  selected_addons: string[];
  notes: string;
}

const emptySpot = (): SpotForm => ({
  cat_name: "",
  cat_colors: "",
  cat_gender: "",
  has_injuries: false,
  selected_addons: [],
  notes: "",
});

type BookingSection = "count" | "contact" | "cats";

function formatHoldClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function BookingAccordionSection({
  stepLabel,
  title,
  summary,
  open,
  locked,
  onSelect,
  timerLabel,
  children,
}: {
  stepLabel: string;
  title: string;
  summary?: string;
  open: boolean;
  locked: boolean;
  onSelect: () => void;
  timerLabel?: string;
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
        {timerLabel && open && !locked && (
          <Badge variant="destructive" className="shrink-0 text-sm px-3 py-1">
            {timerLabel}
          </Badge>
        )}
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
  const [holdPaused, setHoldPaused] = useState(false);
  const [holdExtensionsUsed, setHoldExtensionsUsed] = useState(0);
  const [extendingHold, setExtendingHold] = useState(false);
  const finalExpiryStarted = useRef(false);
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

  const expireHoldForGood = useCallback(
    async (sessionId: string) => {
      await releaseHold(sessionId);
      setHoldSessionId(null);
      setHoldExpiresAt(null);
      setHoldPaused(false);
      setSecondsLeft(0);
      setSection("count");
      setContactConfirmed(false);
      setSubmitError(
        "Your time ran out and your spots were released. Continue from How many cats? to hold spots again."
      );
    },
    [releaseHold]
  );

  useEffect(() => {
    if (!holdExpiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(holdExpiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left > 0) {
        setHoldPaused(false);
        return;
      }
      if (!holdSessionId) return;
      if (holdExtensionsUsed >= CLINIC_HOLD_MAX_EXTENSIONS) {
        if (!finalExpiryStarted.current) {
          finalExpiryStarted.current = true;
          void expireHoldForGood(holdSessionId);
        }
        return;
      }
      setHoldPaused(true);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt, holdSessionId, holdExtensionsUsed, expireHoldForGood]);

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

  function calculateSpotTotal(index: number): number {
    if (!selectedEvent) return 0;
    const totals = calculateSpotTotals(
      selectedEvent,
      getEventCatalog(selectedEvent),
      spots.map((entry) => entry.selected_addons)
    );
    return totals[index] ?? 0;
  }

  function calculateGrandTotal(): number {
    if (!selectedEvent) return 0;
    return calculateBookingGrandTotal(
      selectedEvent,
      getEventCatalog(selectedEvent),
      spots.map((spot) => spot.selected_addons)
    );
  }

  function packagePriceForCount(count: number): number {
    if (!selectedEvent || count < 1) return 0;
    return resolvePackagePrice(selectedEvent, count);
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
    setHoldPaused(false);
    setHoldExtensionsUsed(0);
    finalExpiryStarted.current = false;
    if (spots.length !== result.spot_count) {
      setSpots(Array.from({ length: result.spot_count }, () => emptySpot()));
      setExpandedCats(new Set([0]));
      setContactConfirmed(false);
    }
    setSection("contact");
  }

  async function resumeHold() {
    if (!holdSessionId) return;
    setExtendingHold(true);
    setSubmitError(null);
    const response = await fetch("/api/clinic-booking/extend-hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: holdSessionId }),
    });
    const result = await response.json().catch(() => null);
    setExtendingHold(false);

    if (!response.ok) {
      finalExpiryStarted.current = true;
      setHoldSessionId(null);
      setHoldExpiresAt(null);
      setHoldPaused(false);
      setSection("count");
      setContactConfirmed(false);
      setSubmitError(result?.error ?? "Unable to resume the timer.");
      return;
    }

    setHoldExpiresAt(result.expires_at);
    setHoldExtensionsUsed(result.extensions_used ?? holdExtensionsUsed + 1);
    setHoldPaused(false);
  }

  async function handleSubmit() {
    if (!selectedEvent || !holdSessionId) return;
    if (holdPaused) {
      setSubmitError("Resume the timer before submitting your request.");
      return;
    }
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
        spots: spots.map((spot, index) => ({
          ...contact,
          ...spot,
          has_injuries: spot.has_injuries,
          injury_details: spot.has_injuries ? spot.notes : "",
          notes: spot.has_injuries ? spot.notes : "",
          total_price: calculateSpotTotal(index),
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

  const expandedCatIndex = [...expandedCats][0];

  useEffect(() => {
    if (section !== "cats" || expandedCatIndex == null) return;
    const timeout = window.setTimeout(() => {
      document.getElementById(`cat-card-${expandedCatIndex}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      document.getElementById(`cat-name-${expandedCatIndex}`)?.focus();
    }, 80);
    return () => window.clearTimeout(timeout);
  }, [section, expandedCatIndex]);

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

            {selectedEvent.payment_url &&
              !(
                normalizePricingMode(selectedEvent.pricing_mode) === "sponsored" &&
                calculateGrandTotal() === 0
              ) && (
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
            {normalizePricingMode(selectedEvent.pricing_mode) === "sponsored" &&
              calculateGrandTotal() === 0 && (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100">
                  This clinic is sponsored — no payment is required for your appointment.
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
          <Link href="/" className="mb-4 inline-flex justify-center text-primary">
            <BrandMark nameClassName="text-xl text-primary" />
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
            {(secondsLeft > 0 || holdPaused) && (
              <div
                className={`sticky top-0 z-30 -mx-1 rounded-lg border-2 px-4 py-3 shadow-md ${
                  holdPaused
                    ? "border-amber-500 bg-amber-50 text-amber-950"
                    : "border-destructive bg-destructive text-destructive-foreground"
                }`}
              >
                {holdPaused ? (
                  <div className="space-y-2 text-center">
                    <p className="text-base font-semibold">Time ran out</p>
                    <p className="text-sm">
                      Resume for {CLINIC_HOLD_EXTENSION_MINUTES} more minutes. You can do this{" "}
                      {CLINIC_HOLD_MAX_EXTENSIONS - holdExtensionsUsed} more time
                      {CLINIC_HOLD_MAX_EXTENSIONS - holdExtensionsUsed === 1 ? "" : "s"}.
                    </p>
                    <Button
                      type="button"
                      onClick={() => void resumeHold()}
                      disabled={extendingHold}
                    >
                      {extendingHold ? "Resuming…" : "Resume timer"}
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-center text-base font-semibold tabular-nums">
                      {formatHoldClock(secondsLeft)} left to finish
                    </p>
                    <p className="mt-0.5 text-center text-xs text-destructive-foreground/90">
                      Your spots will be released if this timer runs out
                      {holdExtensionsUsed < CLINIC_HOLD_MAX_EXTENSIONS
                        ? ` (${CLINIC_HOLD_MAX_EXTENSIONS - holdExtensionsUsed} extra ${
                            CLINIC_HOLD_MAX_EXTENSIONS - holdExtensionsUsed === 1
                              ? "extension"
                              : "extensions"
                          } left)`
                        : " (no more extensions)"}.
                    </p>
                  </>
                )}
              </div>
            )}

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
              timerLabel={secondsLeft > 0 ? `${formatHoldClock(secondsLeft)} left` : undefined}
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
                  {typeof spotCount === "number" && spotCount >= 1 && (
                    <p className="text-sm text-muted-foreground">
                      {normalizePricingMode(selectedEvent.pricing_mode) === "sponsored"
                        ? "This clinic is sponsored — package price is free."
                        : `Package price for ${spotCount} cat${spotCount === 1 ? "" : "s"}: ${formatCurrency(packagePriceForCount(spotCount))}`}
                      {normalizePricingMode(selectedEvent.pricing_mode) !== "sponsored"
                        ? " (add-ons extra)"
                        : ""}
                    </p>
                  )}
                </div>
                {section === "count" && submitError && (
                  <p className="text-sm text-destructive">{submitError}</p>
                )}
                <div className="flex justify-end pt-2">
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
              timerLabel={secondsLeft > 0 ? `${formatHoldClock(secondsLeft)} left` : undefined}
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
                <div className="flex justify-end">
                  <Button
                    disabled={!contactReady()}
                    onClick={() => {
                      if (!holdSessionId || !contactReady()) return;
                      setContactConfirmed(true);
                      setExpandedCats(new Set([0]));
                      setSection("cats");
                      setSubmitError(null);
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
              timerLabel={secondsLeft > 0 ? `${formatHoldClock(secondsLeft)} left` : undefined}
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
                    <div
                      key={index}
                      id={`cat-card-${index}`}
                      className={`scroll-mt-28 rounded-lg border ${lockedCat ? "opacity-70" : ""}`}
                    >
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
                          {formatCurrency(calculateSpotTotal(index))}
                        </span>
                      </button>
                      {expanded && !lockedCat && (
                        <div className="space-y-4 border-t p-4">
                          <ClinicBookingCatFields
                            index={index}
                            spot={spot}
                            addons={getAddonOptions(getEventCatalog(selectedEvent))}
                            total={calculateSpotTotal(index)}
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
                  <p className="font-semibold">
                    Estimated grand total: {formatCurrency(calculateGrandTotal())}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {normalizePricingMode(selectedEvent.pricing_mode) === "sponsored"
                      ? "Sponsored package price is free; optional add-ons may still apply. Payment may be collected separately."
                      : normalizePricingMode(selectedEvent.pricing_mode) === "matrix"
                        ? `Package price for ${spots.length} cat${spots.length === 1 ? "" : "s"} (${pricingSummaryLabel(selectedEvent)}) plus any selected add-ons.`
                        : "Base price plus any selected add-ons. Payment may be collected separately."}
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
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => void handleSubmit()}
                    disabled={submitting || holdPaused || spots.some((spot) => !spotReady(spot))}
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
