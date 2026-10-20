"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  applySameClinicHours,
  clinicHoursAreUniform,
  orderedClinicDays,
  pruneClinicHours,
  sharedClinicHours,
  type ClinicDayHours,
  type ClinicHoursByDay,
  type ClinicWeekday,
} from "@/lib/clinics/hours";

interface ClinicHoursEditorProps {
  days: string[];
  hours: ClinicHoursByDay;
  sameHours: boolean;
  onSameHoursChange: (same: boolean) => void;
  onHoursChange: (hours: ClinicHoursByDay) => void;
}

function TimePair({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: ClinicDayHours;
  onChange: (next: ClinicDayHours) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-open`}>Opens</Label>
        <Input
          id={`${idPrefix}-open`}
          type="time"
          value={value.open}
          onChange={(event) => onChange({ ...value, open: event.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-close`}>Closes</Label>
        <Input
          id={`${idPrefix}-close`}
          type="time"
          value={value.close}
          onChange={(event) => onChange({ ...value, close: event.target.value })}
        />
      </div>
    </div>
  );
}

export function ClinicHoursEditor({
  days,
  hours,
  sameHours,
  onSameHoursChange,
  onHoursChange,
}: ClinicHoursEditorProps) {
  const openDays = orderedClinicDays(days);

  if (openDays.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Choose the days this clinic is open, then add hours.
      </p>
    );
  }

  const shared = sharedClinicHours(openDays, hours);

  function setSameHours(checked: boolean) {
    onSameHoursChange(checked);
    if (checked) {
      onHoursChange(applySameClinicHours(openDays, shared.open, shared.close));
    }
  }

  function updateShared(next: ClinicDayHours) {
    onHoursChange(applySameClinicHours(openDays, next.open, next.close));
  }

  function updateDay(day: ClinicWeekday, next: ClinicDayHours) {
    const merged = pruneClinicHours(openDays, { ...hours, [day]: next });
    if (!next.open && !next.close) {
      const copy = { ...merged };
      delete copy[day];
      onHoursChange(copy);
      return;
    }
    onHoursChange({ ...merged, [day]: next });
  }

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-2 text-sm">
        <Checkbox
          checked={sameHours}
          onCheckedChange={(checked) => setSameHours(checked === true)}
          className="mt-0.5"
        />
        <span>
          Same hours every open day
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Turn this off if weekday hours differ.
          </span>
        </span>
      </label>

      {sameHours ? (
        <TimePair idPrefix="clinic-hours" value={shared} onChange={updateShared} />
      ) : (
        <div className="space-y-4">
          {openDays.map((day) => (
            <div key={day} className="space-y-2">
              <p className="text-sm font-medium">{day}</p>
              <TimePair
                idPrefix={`clinic-hours-${day.toLowerCase()}`}
                value={hours[day as ClinicWeekday] ?? { open: "", close: "" }}
                onChange={(next) => updateDay(day as ClinicWeekday, next)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function initialSameHours(days: string[], hours: ClinicHoursByDay): boolean {
  const recorded = Object.keys(hours).length;
  if (recorded === 0) return true;
  return clinicHoursAreUniform(days, hours);
}
