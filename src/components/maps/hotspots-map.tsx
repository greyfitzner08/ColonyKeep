"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Checkbox } from "@/components/ui/checkbox";
import { formatSingleLineAddress } from "@/lib/cases/colony-notes";
import {
  HOTSPOT_COLONY_LEGEND,
  HOTSPOT_OPEN_CASE_COLOR,
  hotspotColonyMarkerColor,
} from "@/lib/cases/status-marker-colors";
import { getStatusLabel, isHotspotColonyStatus } from "@/lib/cases/statuses";
import type { HelpRequest } from "@/lib/types";

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

export interface MapVolunteer {
  id: string;
  full_name: string | null;
  email: string;
  role: string | null;
  home_lat: number;
  home_lng: number;
}

export interface MapFeeder {
  id: string;
  case_number: string;
  feeder_name: string | null;
  feeder_phone: string | null;
  feeder_email: string | null;
  feeder_street: string | null;
  feeder_city: string | null;
  feeder_state: string | null;
  feeder_zip: string | null;
  feeder_county: string | null;
  feeder_lat: number;
  feeder_lng: number;
}

type MapLayer = "colonies" | "volunteers" | "feeders";

const LAYER_COLORS: Record<Exclude<MapLayer, "colonies">, string> = {
  volunteers: "#059669",
  feeders: "#d97706",
};

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

function feederAddress(feeder: MapFeeder): string {
  return (
    formatSingleLineAddress([
      feeder.feeder_street,
      feeder.feeder_city,
      feeder.feeder_state,
      feeder.feeder_zip,
      feeder.feeder_county,
    ]) ?? "Address not available"
  );
}

interface HotspotsMapProps {
  helpRequests: HelpRequest[];
  volunteers: MapVolunteer[];
  feeders: MapFeeder[];
}

export function HotspotsMap({ helpRequests, volunteers, feeders }: HotspotsMapProps) {
  const [mounted, setMounted] = useState(false);
  const [layers, setLayers] = useState<Record<MapLayer, boolean>>({
    colonies: true,
    volunteers: false,
    feeders: false,
  });

  useEffect(() => {
    setMounted(true);
    import("leaflet/dist/leaflet.css");
  }, []);

  const coloniesWithCoords = useMemo(
    () =>
      helpRequests.filter(
        (hr) => hr.colony_lat && hr.colony_lng && isHotspotColonyStatus(hr.status)
      ),
    [helpRequests]
  );

  const allPoints = useMemo(() => {
    const points: [number, number][] = [];
    if (layers.colonies) {
      coloniesWithCoords.forEach((hr) => points.push([hr.colony_lat!, hr.colony_lng!]));
    }
    if (layers.volunteers) {
      volunteers.forEach((v) => points.push([v.home_lat, v.home_lng]));
    }
    if (layers.feeders) {
      feeders.forEach((f) => points.push([f.feeder_lat, f.feeder_lng]));
    }
    return points;
  }, [coloniesWithCoords, volunteers, feeders, layers]);

  const center: [number, number] =
    allPoints.length > 0 ? allPoints[0] : [35.7796, -78.6382];

  const visibleCount =
    (layers.colonies ? coloniesWithCoords.length : 0) +
    (layers.volunteers ? volunteers.length : 0) +
    (layers.feeders ? feeders.length : 0);

  function toggleLayer(layer: MapLayer) {
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));
  }

  if (!mounted) {
    return <div className="h-[400px] sm:h-[500px] lg:h-[600px] bg-muted rounded-lg animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={layers.colonies}
              onCheckedChange={() => toggleLayer("colonies")}
            />
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: HOTSPOT_OPEN_CASE_COLOR }}
            />
            Colonies ({coloniesWithCoords.length})
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={layers.volunteers}
              onCheckedChange={() => toggleLayer("volunteers")}
            />
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: LAYER_COLORS.volunteers }}
            />
            Volunteers & team ({volunteers.length})
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={layers.feeders}
              onCheckedChange={() => toggleLayer("feeders")}
            />
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: LAYER_COLORS.feeders }}
            />
            Colony feeders ({feeders.length})
          </label>
        </div>
        <p className="text-xs text-muted-foreground sm:text-right">
          {visibleCount} location{visibleCount === 1 ? "" : "s"} on map
        </p>
      </div>

      {layers.colonies && (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {HOTSPOT_COLONY_LEGEND.map((entry) => (
            <div key={entry.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="h-3 w-3 shrink-0 rounded-full border border-black/10"
                style={{ backgroundColor: entry.color }}
              />
              {entry.label}
            </div>
          ))}
        </div>
      )}

      <div className="relative isolate z-0 h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg overflow-hidden border [&_.leaflet-container]:z-0">
        <MapContainer center={center} zoom={10} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {layers.colonies &&
            coloniesWithCoords.map((hr) => (
              <CircleMarker
                key={`colony-${hr.id}`}
                center={[hr.colony_lat!, hr.colony_lng!]}
                radius={9}
                pathOptions={{
                  color: hotspotColonyMarkerColor(hr.status),
                  fillColor: hotspotColonyMarkerColor(hr.status),
                  fillOpacity: 0.85,
                  weight: 2,
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
          {layers.volunteers &&
            volunteers.map((volunteer) => (
              <CircleMarker
                key={`volunteer-${volunteer.id}`}
                center={[volunteer.home_lat, volunteer.home_lng]}
                radius={7}
                pathOptions={{
                  color: LAYER_COLORS.volunteers,
                  fillColor: LAYER_COLORS.volunteers,
                  fillOpacity: 0.9,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="space-y-1 text-sm min-w-[180px]">
                    <p className="font-semibold">{volunteer.full_name ?? "Team member"}</p>
                    {volunteer.role && (
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {volunteer.role.replace(/_/g, " ")}
                      </p>
                    )}
                    <p className="text-muted-foreground">{volunteer.email}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          {layers.feeders &&
            feeders.map((feeder) => (
              <CircleMarker
                key={`feeder-${feeder.id}`}
                center={[feeder.feeder_lat, feeder.feeder_lng]}
                radius={8}
                pathOptions={{
                  color: LAYER_COLORS.feeders,
                  fillColor: LAYER_COLORS.feeders,
                  fillOpacity: 0.9,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="space-y-1.5 text-sm min-w-[200px]">
                    <p className="font-semibold">{feeder.feeder_name ?? "Colony feeder"}</p>
                    <p className="text-muted-foreground">{feederAddress(feeder)}</p>
                    {feeder.feeder_phone && (
                      <p>
                        <span className="text-muted-foreground">Phone:</span> {feeder.feeder_phone}
                      </p>
                    )}
                    {feeder.feeder_email && (
                      <p>
                        <span className="text-muted-foreground">Email:</span> {feeder.feeder_email}
                      </p>
                    )}
                    <p>
                      <span className="text-muted-foreground">Case:</span> {feeder.case_number}
                    </p>
                    <a href={`/case/${feeder.id}`} className="inline-block text-primary underline font-medium">
                      View case
                    </a>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
        </MapContainer>
      </div>

      {visibleCount === 0 && (
        <p className="text-sm text-muted-foreground text-center">
          No locations to show. Turn on a map layer above, or add addresses with coordinates for colonies,
          volunteer home addresses, or colony feeder contacts on cases.
        </p>
      )}
    </div>
  );
}
