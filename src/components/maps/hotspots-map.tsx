"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { STATUS_COLORS } from "@/lib/constants";
import { formatSingleLineAddress } from "@/lib/cases/colony-notes";
import { getStatusLabel } from "@/lib/cases/statuses";
import type { HelpRequest, HelpRequestStatus } from "@/lib/types";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

const STATUS_MARKER_COLORS: Record<HelpRequestStatus, string> = {
  new_intake: "#3b82f6",
  under_review: "#eab308",
  needs_more_info: "#f97316",
  routed_to_trap_team: "#a855f7",
  claimed: "#6366f1",
  appointment_needed: "#ec4899",
  appointment_reserved: "#06b6d4",
  cat_trapped: "#14b8a6",
  transported: "#0ea5e9",
  checked_in: "#84cc16",
  completed: "#22c55e",
  closed: "#6b7280",
};

const DEFAULT_MARKER_COLOR = "#6b7280";

function markerColor(status: HelpRequestStatus) {
  return STATUS_MARKER_COLORS[status] ?? DEFAULT_MARKER_COLOR;
}

function colonyAddress(hr: HelpRequest): string {
  return (
    formatSingleLineAddress([
      hr.colony_address,
      hr.colony_city,
      hr.colony_state,
      hr.colony_zip,
      hr.colony_county,
    ]) ?? "Address not available"
  );
}

interface HotspotsMapProps {
  helpRequests: HelpRequest[];
}

export function HotspotsMap({ helpRequests }: HotspotsMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    import("leaflet/dist/leaflet.css");
  }, []);

  const withCoords = helpRequests.filter((hr) => hr.colony_lat && hr.colony_lng);
  const center = withCoords.length > 0
    ? [withCoords[0].colony_lat!, withCoords[0].colony_lng!] as [number, number]
    : [39.8283, -98.5795] as [number, number];

  if (!mounted) {
    return <div className="h-[600px] bg-muted rounded-lg animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_COLORS).slice(0, 6).map(([status]) => (
          <div key={status} className="flex items-center gap-1 text-xs">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: STATUS_MARKER_COLORS[status as HelpRequestStatus] }}
            />
            {status.replace(/_/g, " ")}
          </div>
        ))}
      </div>
      <div className="h-[600px] rounded-lg overflow-hidden border">
        <MapContainer center={center} zoom={10} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {withCoords.map((hr) => (
            <CircleMarker
              key={hr.id}
              center={[hr.colony_lat!, hr.colony_lng!]}
              radius={8}
              pathOptions={{
                color: markerColor(hr.status),
                fillColor: markerColor(hr.status),
                fillOpacity: 0.7,
              }}
            >
              <Popup>
                <div className="space-y-1.5 text-sm min-w-[200px]">
                  <p className="font-semibold">{hr.case_number}</p>
                  <p className="text-muted-foreground">{colonyAddress(hr)}</p>
                  <p>
                    <span className="text-muted-foreground">Trap team:</span>{" "}
                    {hr.assigned_team_name?.trim() || "Unassigned"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    {getStatusLabel(hr.status)}
                  </p>
                  <a href={`/case/${hr.id}`} className="inline-block text-primary underline font-medium">
                    View full case
                  </a>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      {withCoords.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">
          No colony locations could be mapped yet. Cases need a colony address, city, or ZIP in the inquiry queue.
        </p>
      )}
    </div>
  );
}
