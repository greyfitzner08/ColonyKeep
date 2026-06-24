"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EquipmentQrScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (payload: string) => void;
}

export function EquipmentQrScanner({ open, onOpenChange, onScan }: EquipmentQrScannerProps) {
  const regionId = useId().replace(/:/g, "");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const scanner = new Html5Qrcode(regionId);
    scannerRef.current = scanner;
    setError(null);
    setStarting(true);

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => {
          onScan(decoded);
          onOpenChange(false);
        },
        () => {
          // Ignore per-frame scan misses.
        }
      )
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : "Unable to access camera. Check browser permissions.";
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setStarting(false);
      });

    return () => {
      cancelled = true;
      const active = scannerRef.current;
      scannerRef.current = null;
      if (active?.isScanning) {
        void active.stop().catch(() => undefined);
      }
    };
  }, [open, onOpenChange, onScan, regionId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Equipment QR Code
          </DialogTitle>
          <DialogDescription>
            Point your camera at the trap&apos;s QR label. Type, label, and description will fill
            in automatically when recognized.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div
            id={regionId}
            className="overflow-hidden rounded-lg border bg-muted min-h-[260px]"
          />
          {starting && !error && (
            <p className="text-sm text-muted-foreground text-center">Starting camera…</p>
          )}
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
