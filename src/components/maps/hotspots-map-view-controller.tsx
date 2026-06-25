"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { denseClusterPoints, densityMapCenter } from "@/lib/maps/density-center";

interface HotspotsMapViewControllerProps {
  points: [number, number][];
}

export function HotspotsMapViewController({ points }: HotspotsMapViewControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

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
