"use client";

import { useState, useEffect } from "react";
import { Cat, CheckCircle, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { PublicClinicEvent } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export default function ClinicBookingPage() {
  const [events, setEvents] = useState<PublicClinicEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<PublicClinicEvent | null>(null);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    cat_name: "",
    cat_colors: "",
    cat_breed: "",
    cat_gender: "",
    has_injuries: false,
    injury_details: "",
    selected_addons: [] as string[],
    notes: "",
  });

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("public_clinic_events")
      .select("*")
      .eq("is_active", true)
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date")
      .then(async ({ data }) => {
        if (data) {
          setEvents(data as PublicClinicEvent[]);
          const counts: Record<string, number> = {};
          for (const event of data) {
            const { count } = await supabase
              .from("public_bookings")
              .select("*", { count: "exact", head: true })
              .eq("event_id", event.id)
              .in("status", ["pending", "confirmed"]);
            counts[event.id] = count ?? 0;
          }
          setBookingCounts(counts);
        }
      });
  }, []);

  function calculateTotal(): number {
    if (!selectedEvent) return 0;
    let total = selectedEvent.base_price;
    for (const addon of form.selected_addons) {
      const addonService = selectedEvent.addon_services.find((a) => a.name === addon);
      if (addonService) total += addonService.price;
    }
    return total;
  }

  async function handleSubmit() {
    if (!selectedEvent) return;
    setSubmitting(true);
    const supabase = createClient();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { error } = await supabase.from("public_bookings").insert({
      event_id: selectedEvent.id,
      status: "pending",
      expires_at: expiresAt.toISOString(),
      ...form,
      total_price: calculateTotal(),
    });

    setSubmitting(false);
    if (!error) setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CheckCircle className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle>Booking Submitted</CardTitle>
            <CardDescription>
              Your booking is pending confirmation. You will receive an email with next steps.
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
            {events.length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No upcoming clinic events available.</CardContent></Card>
            )}
            {events.map((event) => {
              const booked = bookingCounts[event.id] ?? 0;
              const remaining = event.total_spots - booked;
              return (
                <Card key={event.id} className={remaining <= 0 ? "opacity-60" : "cursor-pointer hover:shadow-md transition-shadow"} onClick={() => remaining > 0 && setSelectedEvent(event)}>
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
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{selectedEvent.title}</CardTitle>
              <CardDescription>{formatDate(selectedEvent.date)} — {selectedEvent.location}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 0 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Name</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} required /></div>
                    <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} required /></div>
                  </div>
                  <div className="space-y-2"><Label>Phone</Label><Input type="tel" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} required /></div>
                </>
              )}
              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Cat Name (if known)</Label><Input value={form.cat_name} onChange={(e) => setForm({ ...form, cat_name: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Gender</Label><Input value={form.cat_gender} onChange={(e) => setForm({ ...form, cat_gender: e.target.value })} placeholder="M/F/Unknown" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Colors</Label><Input value={form.cat_colors} onChange={(e) => setForm({ ...form, cat_colors: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Breed</Label><Input value={form.cat_breed} onChange={(e) => setForm({ ...form, cat_breed: e.target.value })} /></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={form.has_injuries} onCheckedChange={(v) => setForm({ ...form, has_injuries: !!v })} />
                    <Label>Cat has injuries or medical concerns</Label>
                  </div>
                  {form.has_injuries && (
                    <div className="space-y-2"><Label>Injury Details</Label><Textarea value={form.injury_details} onChange={(e) => setForm({ ...form, injury_details: e.target.value })} /></div>
                  )}
                </>
              )}
              {step === 2 && (
                <>
                  {selectedEvent.addon_services.length > 0 && (
                    <div className="space-y-3">
                      <Label>Optional Add-on Services</Label>
                      {selectedEvent.addon_services.map((addon) => (
                        <div key={addon.name} className="flex items-center gap-2">
                          <Checkbox
                            checked={form.selected_addons.includes(addon.name)}
                            onCheckedChange={(v) => {
                              setForm({
                                ...form,
                                selected_addons: v
                                  ? [...form.selected_addons, addon.name]
                                  : form.selected_addons.filter((a) => a !== addon.name),
                              });
                            }}
                          />
                          <Label>{addon.name} — {formatCurrency(addon.price)}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="font-semibold">Total: {formatCurrency(calculateTotal())}</p>
                    {selectedEvent.cost_description && <p className="text-sm text-muted-foreground mt-1">{selectedEvent.cost_description}</p>}
                  </div>
                </>
              )}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => step === 0 ? setSelectedEvent(null) : setStep(step - 1)}>Back</Button>
                {step < 2 ? (
                  <Button onClick={() => setStep(step + 1)}>Next</Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Booking..." : "Confirm Booking"}</Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
