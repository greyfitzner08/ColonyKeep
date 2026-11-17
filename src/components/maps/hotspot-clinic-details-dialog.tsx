"use client";

import { useEffect, useState } from "react";
import { ClinicDetailsDialog } from "@/components/clinics/clinic-details-dialog";
import type { Clinic } from "@/lib/types";

interface HotspotClinicDetailsDialogProps {
  clinicId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HotspotClinicDetailsDialog({
  clinicId,
  open,
  onOpenChange,
}: HotspotClinicDetailsDialogProps) {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !clinicId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setClinic(null);

    async function loadClinic() {
      try {
        const response = await fetch(`/api/hotspots/clinics/${clinicId}`);
        const payload = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok) {
          setError(payload?.error ?? "Unable to load clinic details.");
          setClinic(null);
          return;
        }
        setClinic((payload?.clinic as Clinic) ?? null);
      } catch {
        if (!cancelled) {
          setError("Unable to load clinic details.");
          setClinic(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadClinic();
    return () => {
      cancelled = true;
    };
  }, [open, clinicId]);

  return (
    <ClinicDetailsDialog
      clinic={clinic}
      open={open}
      onOpenChange={onOpenChange}
      loading={loading}
      error={error}
    />
  );
}
