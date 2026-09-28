"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseVetCareDueList, type VetCareDueEntry } from "@/lib/adoption/entrance";

export function VetCareDueList({
  id,
  value,
  invalid,
  onChange,
}: {
  id: string;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const rows = parseVetCareDueList(value);

  function write(next: VetCareDueEntry[]) {
    onChange(next.length === 0 ? "" : JSON.stringify(next));
  }

  function update(index: number, patch: Partial<VetCareDueEntry>) {
    write(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No veterinary services added yet.</p>
      )}
      {rows.map((row, index) => (
        <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-service-${index}`}>Service</Label>
            <Input
              id={`${id}-service-${index}`}
              value={row.service}
              maxLength={200}
              placeholder="Rabies booster"
              aria-invalid={invalid}
              onChange={(event) => update(index, { service: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-date-${index}`}>Due date</Label>
            <Input
              id={`${id}-date-${index}`}
              type="date"
              value={row.date}
              aria-invalid={invalid}
              onChange={(event) => update(index, { date: event.target.value })}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 w-9 px-0"
            aria-label={`Remove service ${index + 1}`}
            onClick={() => write(rows.filter((_, i) => i !== index))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={rows.length >= 12}
        onClick={() => write([...rows, { service: "", date: "" }])}
      >
        <Plus className="h-3.5 w-3.5" />
        Add service
      </Button>
    </div>
  );
}
