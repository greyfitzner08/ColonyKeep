"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VACCINATION_TYPES,
  parseVaccinationList,
  type VaccinationEntry,
} from "@/lib/adoption/entrance";

export function VaccinationList({
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
  const rows = parseVaccinationList(value);

  function write(next: VaccinationEntry[]) {
    onChange(next.length === 0 ? "" : JSON.stringify(next));
  }

  function update(index: number, patch: Partial<VaccinationEntry>) {
    write(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No vaccinations added yet.</p>
      )}
      {rows.map((row, index) => (
        <div key={index} className="space-y-3 rounded-lg border p-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-type-${index}`}>Type</Label>
              <Select
                value={row.type || "unset"}
                onValueChange={(next) =>
                  update(index, {
                    type: next === "unset" ? "" : (next as VaccinationEntry["type"]),
                    other: next === "other" ? row.other : "",
                  })
                }
              >
                <SelectTrigger id={`${id}-type-${index}`} aria-invalid={invalid}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Select type</SelectItem>
                  {VACCINATION_TYPES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-date-${index}`}>Date received</Label>
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
              aria-label={`Remove vaccination ${index + 1}`}
              onClick={() => write(rows.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {row.type === "other" ? (
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-other-${index}`}>What was it?</Label>
              <Input
                id={`${id}-other-${index}`}
                value={row.other}
                maxLength={200}
                placeholder="Vaccine name"
                aria-invalid={invalid}
                onChange={(event) => update(index, { other: event.target.value })}
              />
            </div>
          ) : null}
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={rows.length >= 12}
        onClick={() => write([...rows, { type: "", other: "", date: "" }])}
      >
        <Plus className="h-3.5 w-3.5" />
        Add vaccination
      </Button>
    </div>
  );
}
