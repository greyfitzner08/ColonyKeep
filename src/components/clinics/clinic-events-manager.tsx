"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PublicClinicEvent, PublicBooking } from "@/lib/types";
import { Plus } from "lucide-react";

interface ClinicEventsManagerProps {
  events: PublicClinicEvent[];
  clinics: { id: string; name: string }[];
  bookings: PublicBooking[];
}

export function ClinicEventsManager({ events, clinics, bookings }: ClinicEventsManagerProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    clinic_id: "",
    title: "",
    date: "",
    location: "",
    total_spots: 20,
    description: "",
    base_price: 0,
    cost_description: "",
    payment_url: "",
    included_services: "",
    is_active: true,
  });

  async function createEvent() {
    const clinic = clinics.find((c) => c.id === form.clinic_id);
    if (!clinic) {
      setCreateError("Select a clinic before creating an event.");
      return;
    }
    setCreateError(null);
    setCreating(true);
    const response = await fetch("/api/clinic-events/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
      clinic_id: form.clinic_id,
      clinic_name: clinic.name,
      title: form.title,
      date: form.date,
      location: form.location,
      total_spots: form.total_spots,
      description: form.description,
      base_price: form.base_price,
      cost_description: form.cost_description,
      payment_url: form.payment_url,
      included_services: form.included_services.split(",").map((s) => s.trim()).filter(Boolean),
      addon_services: [],
      is_active: form.is_active,
      }),
    });
    const result = await response.json().catch(() => null);
    setCreating(false);

    if (!response.ok) {
      setCreateError(result?.error ?? "Unable to create clinic event");
      return;
    }

    setDialogOpen(false);
    router.refresh();
  }

  const eventBookings = selectedEvent
    ? bookings.filter((b) => b.event_id === selectedEvent)
    : [];

  return (
    <div className="space-y-4">
      <Button onClick={() => { setCreateError(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Create Event</Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((event) => {
          const booked = bookings.filter(
            (b) => b.event_id === event.id && ["pending", "confirmed"].includes(b.status)
          ).length;
          return (
            <Card key={event.id} className="cursor-pointer hover:shadow-md" onClick={() => setSelectedEvent(event.id)}>
              <CardHeader>
                <div className="flex justify-between">
                  <CardTitle className="text-base">{event.title}</CardTitle>
                  <Badge variant={event.is_active ? "default" : "secondary"}>
                    {event.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{event.clinic_name}</p>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>{formatDate(event.date)} · {event.location}</p>
                <p>{booked}/{event.total_spots} booked · {formatCurrency(event.base_price)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedEvent && (
        <Card>
          <CardHeader>
            <CardTitle>Bookings for Event</CardTitle>
          </CardHeader>
          <CardContent>
            {eventBookings.length === 0 ? (
              <p className="text-muted-foreground">No bookings yet</p>
            ) : (
              <div className="space-y-2">
                {eventBookings.map((b) => (
                  <div key={b.id} className="flex justify-between text-sm border-b pb-2">
                    <div>
                      <p className="font-medium">{b.contact_name}</p>
                      <p className="text-muted-foreground">{b.cat_name ?? "Unnamed cat"} · {b.contact_email}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{b.status}</Badge>
                      <p className="text-xs mt-1">{formatCurrency(b.total_price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Clinic Event</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Clinic</Label>
              <Select value={form.clinic_id} onValueChange={(v) => setForm({ ...form, clinic_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select clinic" /></SelectTrigger>
                <SelectContent>
                  {clinics.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div className="space-y-1"><Label>Total Spots</Label><Input type="number" value={form.total_spots} onChange={(e) => setForm({ ...form, total_spots: parseInt(e.target.value) || 0 })} /></div>
            <div className="space-y-1"><Label>Base Price</Label><Input type="number" step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: parseFloat(e.target.value) || 0 })} /></div>
            <div className="space-y-1"><Label>Included Services (comma-separated)</Label><Input value={form.included_services} onChange={(e) => setForm({ ...form, included_services: e.target.value })} /></div>
            <div className="space-y-1"><Label>Payment URL</Label><Input value={form.payment_url} onChange={(e) => setForm({ ...form, payment_url: e.target.value })} /></div>
            <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
            <Button onClick={createEvent} className="w-full" disabled={creating}>
              {creating ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
