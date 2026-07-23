"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AddressParts {
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
  required?: boolean;
  id?: string;
  placeholder?: string;
}

interface Prediction {
  description: string;
  place_id: string;
}

/** Build a single-line address when the form only stores one address field. */
export function formatAddressPartsLine(
  parts: Pick<AddressParts, "address" | "city" | "state" | "zip">
): string {
  const cityState = [parts.city, parts.state].filter(Boolean).join(", ");
  const cityStateZip = [cityState, parts.zip].filter(Boolean).join(" ");
  return [parts.address, cityStateZip].filter(Boolean).join(", ");
}

export function AddressAutocomplete({
  onSelect,
  onAddressChange,
  defaultValue = "",
  label = "Address",
  required = false,
  id,
  placeholder = "Start typing an address...",
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(defaultValue);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastDefaultRef = useRef(defaultValue);

  useEffect(() => {
    // Only sync from parent when the default changes externally (e.g. dialog open / place select),
    // not on every keystroke echo from onAddressChange.
    if (defaultValue !== lastDefaultRef.current && defaultValue !== query) {
      setQuery(defaultValue);
    }
    lastDefaultRef.current = defaultValue;
  }, [defaultValue, query]);

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
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={query}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          onAddressChange?.(value);
        }}
        onFocus={() => predictions.length > 0 && setOpen(true)}
        onBlur={() => {
          // Delay so suggestion click can register
          window.setTimeout(() => setOpen(false), 150);
        }}
        placeholder={placeholder}
        autoComplete="off"
        required={required}
      />
      {open && predictions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          {predictions.map((p) => (
            <li key={p.place_id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={(event) => event.preventDefault()}
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
