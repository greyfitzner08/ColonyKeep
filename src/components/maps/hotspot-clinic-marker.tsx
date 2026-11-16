"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { HOTSPOT_CLINIC_COLOR } from "@/lib/cases/status-marker-colors";
import type { MapClinic } from "@/lib/hotspots/load-hotspot-clinics";

const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), {
  ssr: false,
});
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});

function clinicMarkerIconHtml(color: string) {
  return `<div style="width:28px;height:28px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" fill="#fff"/>
  </svg>
</div>`;
}

interface HotspotClinicMarkerProps {
  clinic: MapClinic;
}

export function HotspotClinicMarker({ clinic }: HotspotClinicMarkerProps) {
  const icon = useMemo(() => {
    // Leaflet only runs in the browser; Marker is client-only.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet") as typeof import("leaflet");
    return L.divIcon({
      className: "hotspot-clinic-marker",
      html: clinicMarkerIconHtml(HOTSPOT_CLINIC_COLOR),
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });
  }, []);

  return (
    <Marker position={[clinic.clinic_lat, clinic.clinic_lng]} icon={icon}>
      <Popup>
        <div className="space-y-1.5 text-sm max-w-[min(280px,70vw)] w-full">
          <p className="font-semibold">{clinic.name}</p>
          <p className="text-muted-foreground">{clinic.address}</p>
          {clinic.phone ? (
            <p>
              <span className="text-muted-foreground">Phone:</span>{" "}
              <a href={`tel:${clinic.phone}`} className="text-primary hover:underline">
                {clinic.phone}
              </a>
            </p>
          ) : null}
          {clinic.website ? (
            <p>
              <a
                href={clinic.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline font-medium"
              >
                Website
              </a>
            </p>
          ) : null}
        </div>
      </Popup>
    </Marker>
  );
}
