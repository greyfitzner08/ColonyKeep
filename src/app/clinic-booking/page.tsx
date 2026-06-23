"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Cat, CheckCircle, Calendar, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PublicClinicEvent } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

interface SpotForm {
  cat_name: string;
  cat_colors: string;
  cat_breed: string;
  cat_gender: string;
  has_injuries: boolean;
  injury_details: string;
  selected_addons: string[];
  notes: string;
}

const emptySpot = (): SpotForm => ({
  cat_name: "",
  cat_colors: "",
  cat_breed: "",
  cat_gender: "",
  has_injuries: false,
  injury_details: "",
  selected_addons: [],
  notes: "",
});

function ClinicBookingContent() {
  const searchParams = useSearchParams();
  const eventFilter = searchParams.get("event");

  const [events, setEvents] = useState<PublicClinicEvent[]>([]);
  const [available, setAvailable] = useState<Record<string, number>>({});
  const [selectedEvent, setSelectedEvent] = useState<PublicClinicEvent | null>(null);
  const [spotCount, setSpotCount] = useState(1);
  const [holdSessionId, setHoldSessionId] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [step, setStep] = useState(0);
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

  const releaseHold = useCallback(async (sessionId: string) => {
    await fetch("/api/clinic-booking/release-hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    }).catch(() => null);
  }, []);

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
        setStep(0);
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

  function calculateSpotTotal(spot: SpotForm): number {
    if (!selectedEvent) return 0;
    let total = selectedEvent.base_price;
    for (const addon of spot.selected_addons) {
      const addonService = selectedEvent.addon_services.find((a) => a.name === addon);
      if (addonService) total += addonService.price;
    }
    return total;
  }

  function calculateGrandTotal(): number {
    return spots.reduce((sum, spot) => sum + calculateSpotTotal(spot), 0);
  }

  async function startHold() {
    if (!selectedEvent) return;
    setSubmitError(null);
    setHolding(true);
    const response = await fetch("/api/clinic-booking/hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: selectedEvent.id, spot_count: spotCount }),
    });
    const result = await response.json().catch(() => null);
    setHolding(false);

    if (!response.ok) {
      setSubmitError(result?.error ?? "Unable to hold spots");
      return;
    }

    setHoldSessionId(result.session_id);
    setHoldExpiresAt(result.expires_at);
    setSpots(Array.from({ length: result.spot_count }, () => emptySpot()));
    setStep(1);
  }

  async function handleSubmit() {
    if (!selectedEvent || !holdSessionId) return;
    setSubmitError(null);
    setSubmitting(true);

    const response = await fetch("/api/clinic-booking/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: holdSessionId,
        spots: spots.map((spot) => ({
          ...contact,
          ...spot,
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

  async function cancelBooking() {
    if (holdSessionId) await releaseHold(holdSessionId);
    setHoldSessionId(null);
    setHoldExpiresAt(null);
    setStep(0);
    setSelectedEvent(null);
    setSubmitError(null);
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CheckCircle className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle>Booking Submitted</CardTitle>
            <CardDescription>
              Your {spots.length > 1 ? `${spots.length} bookings are` : "booking is"} pending
              confirmation. You will receive an email with next steps.
              {selectedEvent?.payment_url && (
                <span className="block mt-2">
                  <a href={selectedEvent.payment_url} className="text-primary underline" target="_blank" rel="noopener">
                    Complete payment here
                  </a>
                </span>
              )}
            </CardDescription>
          </CardHeader>
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
          <p className="text-muted-foreground mt-1">Reserve a spot at an upcoming TNVR clinic</p>
        </div>

        {!selectedEvent ? (
          <div className="grid gap-4">
            {loadError && (
              <Card><CardContent className="py-8 text-center text-destructive">{loadError}</CardContent></Card>
            )}
            {events.length === 0 && !loadError && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No upcoming clinic events available.</CardContent></Card>
            )}
            {events.map((event) => {
              const remaining = available[event.id] ?? event.total_spots;
              return (
                <Card
                  key={event.id}
                  className={remaining <= 0 ? "opacity-60" : "cursor-pointer hover:shadow-md transition-shadow"}
                  onClick={() => remaining > 0 && setSelectedEvent(event)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <Badge variant={remaining > 0 ? "default" : "secondary"}>
                        {remaining} spots left
                      </Badge>
                    </div>
                    <CardDescription>{event.clinic_name}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{formatDate(event.date)}</div>
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{event.location}</div>
                    <p className="font-medium">{formatCurrency(event.base_price)} base price</p>
                    {event.included_services.length > 0 && (
                      <p className="text-muted-foreground">Includes: {event.included_services.join(", ")}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : step === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{selectedEvent.title}</CardTitle>
              <CardDescription>{formatDate(selectedEvent.date)} — {selectedEvent.location}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {available[selectedEvent.id] ?? selectedEvent.total_spots} spots available
              </p>
              <div className="space-y-2">
                <Label>How many cats are you booking?</Label>
                <Input
                  type="number"
                  min={1}
                  max={Math.min(20, available[selectedEvent.id] ?? selectedEvent.total_spots)}
                  value={spotCount}
                  onChange={(e) =>
                    setSpotCount(
                      Math.min(
                        Math.max(parseInt(e.target.value, 10) || 1, 1),
                        Math.min(20, available[selectedEvent.id] ?? selectedEvent.total_spots)
                      )
                    )
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Spots are held for 10 minutes while you complete the form.
                </p>
              </div>
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>Back</Button>
                <Button onClick={startHold} disabled={holding}>
                  {holding ? "Holding spots…" : `Hold ${spotCount} spot${spotCount === 1 ? "" : "s"}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <CardTitle>{selectedEvent.title}</CardTitle>
                  <CardDescription>{formatDate(selectedEvent.date)} — {spots.length} spot{spots.length === 1 ? "" : "s"}</CardDescription>
                </div>
                {secondsLeft > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3" />
                    {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Your contact information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Name</Label><Input value={contact.contact_name} onChange={(e) => setContact({ ...contact, contact_name: e.target.value })} required /></div>
                    <div className="space-y-2"><Label>Email</Label><Input type="email" value={contact.contact_email} onChange={(e) => setContact({ ...contact, contact_email: e.target.value })} required /></div>
                  </div>
                  <div className="space-y-2"><Label>Phone</Label><Input type="tel" value={contact.contact_phone} onChange={(e) => setContact({ ...contact, contact_phone: e.target.value })} required /></div>
                </div>
              )}

              {step === 2 && spots.map((spot, index) => (
                <div key={index} className="rounded-lg border p-4 space-y-4">
                  <h3 className="font-semibold">Cat {index + 1} of {spots.length}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Cat Name (if known)</Label><Input value={spot.cat_name} onChange={(e) => { const next = [...spots]; next[index] = { ...spot, cat_name: e.target.value }; setSpots(next); }} /></div>
                    <div className="space-y-2"><Label>Gender</Label><Input value={spot.cat_gender} onChange={(e) => { const next = [...spots]; next[index] = { ...spot, cat_gender: e.target.value }; setSpots(next); }} placeholder="M/F/Unknown" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Colors</Label><Input value={spot.cat_colors} onChange={(e) => { const next = [...spots]; next[index] = { ...spot, cat_colors: e.target.value }; setSpots(next); }} /></div>
                    <div className="space-y-2"><Label>Breed</Label><Input value={spot.cat_breed} onChange={(e) => { const next = [...spots]; next[index] = { ...spot, cat_breed: e.target.value }; setSpots(next); }} /></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={spot.has_injuries} onCheckedChange={(v) => { const next = [...spots]; next[index] = { ...spot, has_injuries: !!v }; setSpots(next); }} />
                    <Label>Cat has injuries or medical concerns</Label>
                  </div>
                  {spot.has_injuries && (
                    <div className="space-y-2"><Label>Injury Details</Label><Textarea value={spot.injury_details} onChange={(e) => { const next = [...spots]; next[index] = { ...spot, injury_details: e.target.value }; setSpots(next); }} /></div>
                  )}
                  {selectedEvent.addon_services.length > 0 && (
                    <div className="space-y-3">
                      <Label>Optional Add-on Services</Label>
                      {selectedEvent.addon_services.map((addon) => (
                        <div key={addon.name} className="flex items-center gap-2">
                          <Checkbox
                            checked={spot.selected_addons.includes(addon.name)}
                            onCheckedChange={(v) => {
                              const next = [...spots];
                              next[index] = {
                                ...spot,
                                selected_addons: v
                                  ? [...spot.selected_addons, addon.name]
                                  : spot.selected_addons.filter((a) => a !== addon.name),
                              };
                              setSpots(next);
                            }}
                          />
                          <Label>{addon.name} — {formatCurrency(addon.price)}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2"><Label>Notes</Label><Textarea value={spot.notes} onChange={(e) => { const next = [...spots]; next[index] = { ...spot, notes: e.target.value }; setSpots(next); }} /></div>
                  <p className="text-sm text-muted-foreground">Spot total: {formatCurrency(calculateSpotTotal(spot))}</p>
                </div>
              ))}

              {step === 2 && (
                <div className="rounded-lg bg-muted p-4">
                  <p className="font-semibold">Grand total: {formatCurrency(calculateGrandTotal())}</p>
                  {selectedEvent.cost_description && (
                    <p className="text-sm text-muted-foreground mt-1">{selectedEvent.cost_description}</p>
                  )}
                </div>
              )}

              {submitError && <p className="text-sm text-destructive">{submitError}</p>}

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (step === 1) cancelBooking();
                    else setStep(step - 1);
                  }}
                >
                  Back
                </Button>
                {step < 2 ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={step === 1 && (!contact.contact_name || !contact.contact_email || !contact.contact_phone)}
                  >
                    Next
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting ? "Submitting…" : `Confirm ${spots.length} booking${spots.length === 1 ? "" : "s"}`}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
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
