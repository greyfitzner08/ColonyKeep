"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { VolunteerHours, Shift, Profile } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface MyImpactDashboardProps {
  hours: VolunteerHours[];
  shifts: Shift[];
  casesWorked: number;
  profile: Profile | null;
}

export function MyImpactDashboard({ hours, shifts, casesWorked, profile }: MyImpactDashboardProps) {
  const router = useRouter();
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().split("T")[0],
    hours: 1,
    hour_type: "trapping",
    notes: "",
  });

  const totalHours = hours.reduce((sum, h) => sum + Number(h.hours), 0);

  const byType = hours.reduce(
    (acc, h) => {
      acc[h.hour_type] = (acc[h.hour_type] ?? 0) + Number(h.hours);
      return acc;
    },
    {} as Record<string, number>
  );

  const chartData = Object.entries(byType).map(([type, hrs]) => ({ type, hours: hrs }));

  async function logHours() {
    if (!profile) return;
    const supabase = createClient();
    await supabase.from("volunteer_hours").insert({
      volunteer_email: profile.email,
      volunteer_name: profile.full_name ?? profile.email,
      team_id: profile.team_id,
      ...logForm,
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Total Hours</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalHours.toFixed(1)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Shifts Attended</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{shifts.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Cases Worked</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{casesWorked}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Hour Types</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{Object.keys(byType).length}</p></CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Hours by Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="hsl(162 63% 35%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Log Hours</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={logForm.date} onChange={(e) => setLogForm({ ...logForm, date: e.target.value })} /></div>
          <div className="space-y-2"><Label>Hours</Label><Input type="number" step={0.5} min={0.5} value={logForm.hours} onChange={(e) => setLogForm({ ...logForm, hours: parseFloat(e.target.value) || 0 })} /></div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={logForm.hour_type} onValueChange={(v) => setLogForm({ ...logForm, hour_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="trapping">Trapping</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
                <SelectItem value="clinic">Clinic</SelectItem>
                <SelectItem value="recovery">Recovery</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Input value={logForm.notes} onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })} /></div>
          <Button onClick={logHours} className="md:col-span-2">Log Hours</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Hours</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {hours.slice(0, 10).map((h) => (
              <div key={h.id} className="flex justify-between text-sm border-b pb-2">
                <span>{formatDate(h.date)} · {h.hour_type}</span>
                <span className="font-medium">{h.hours} hrs</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
