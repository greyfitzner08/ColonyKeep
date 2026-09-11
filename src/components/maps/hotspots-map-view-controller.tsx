"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { denseClusterPoints, densityMapCenter } from "@/lib/maps/density-center";

interface HotspotsMapViewControllerProps {
  points: [number, number][];
}

/**
 * Fit the map once when points first appear. Do not refit when the user toggles
 * layers or filters — that would yank the viewport to a new area.
 */
export function HotspotsMapViewController({ points }: HotspotsMapViewControllerProps) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (points.length === 0 || hasFittedRef.current) return;

    hasFittedRef.current = true;

    void import("leaflet").then((L) => {
      if (points.length === 1) {
        map.setView(points[0], 12, { animate: false });
        return;
      }

      const clusterPoints = denseClusterPoints(points);
      const bounds = L.latLngBounds(clusterPoints.map(([lat, lng]) => [lat, lng]));

      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.3), { maxZoom: 12, animate: false });
        return;
      }

      map.setView(densityMapCenter(points), 11, { animate: false });
    });
  }, [map, points]);

  return null;
}
