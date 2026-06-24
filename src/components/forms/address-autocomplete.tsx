"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddressParts {
  address: string;
  city: string;
  state: string;
  county: string;
  zip: string;
  lat?: number;
  lng?: number;
}

interface AddressAutocompleteProps {
  onSelect: (parts: AddressParts) => void;
  onAddressChange?: (address: string) => void;
  defaultValue?: string;
  label?: string;
}

interface Prediction {
  description: string;
  place_id: string;
}

export function AddressAutocomplete({
  onSelect,
  onAddressChange,
  defaultValue = "",
  label = "Colony Address",
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(defaultValue);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setQuery(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    if (query.length < 3) {
      setPredictions([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}`);
        const data = await res.json();
        setPredictions(data.predictions ?? []);
        setOpen(true);
      } catch {
        setPredictions([]);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  async function handleSelect(prediction: Prediction) {
    setQuery(prediction.description);
    setOpen(false);

    try {
      const res = await fetch(`/api/places/details?place_id=${prediction.place_id}`);
      const data = await res.json();
      onSelect(data);
    } catch {
      onSelect({ address: prediction.description, city: "", state: "", county: "", zip: "" });
    }
  }

  return (
    <div className="relative space-y-2">
      <Label>{label}</Label>
      <Input
        value={query}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          onAddressChange?.(value);
        }}
        onFocus={() => predictions.length > 0 && setOpen(true)}
        placeholder="Start typing an address..."
        autoComplete="off"
        required
      />
      {open && predictions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          {predictions.map((p) => (
            <li key={p.place_id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => handleSelect(p)}
              >
                {p.description}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
