"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Stethoscope } from "lucide-react";
import {
  upcomingVetCareAlerts,
  vetCareDueTimingLabel,
  type VetCareDueAlert,
} from "@/lib/adoption/entrance";

export function VetCareDueBanner({ alerts }: { alerts: VetCareDueAlert[] }) {
  const due = useMemo(() => upcomingVetCareAlerts(alerts), [alerts]);
  if (due.length === 0) return null;

  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">Veterinary care due</p>
        <ul className="space-y-0.5">
          {due.map((alert) => (
            <li key={`${alert.applicationId}-${alert.service}-${alert.date}`}>
              {alert.catName} — {alert.service} ({vetCareDueTimingLabel(alert.date)})
            </li>
          ))}
        </ul>
        <Link href="/adoption" className="inline-block font-medium underline underline-offset-2">
          Open adoptable cats
        </Link>
      </div>
    </div>
  );
}
