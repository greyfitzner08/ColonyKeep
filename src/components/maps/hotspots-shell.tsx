"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HotspotsColoniesTable } from "@/components/maps/hotspots-colonies-table";
import type { MapFeeder } from "@/components/maps/hotspots-map";
import type { HotspotMapVolunteer } from "@/lib/hotspots/volunteer-role-filter";
import type { HelpRequest } from "@/lib/types";

const HotspotsMap = dynamic(
  () => import("@/components/maps/hotspots-map").then((mod) => mod.HotspotsMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] sm:h-[500px] lg:h-[600px] bg-muted rounded-lg animate-pulse" />
    ),
  }
);

interface HotspotsShellProps {
  helpRequests: HelpRequest[];
  feeders: MapFeeder[];
  initialVolunteers: HotspotMapVolunteer[];
}

export function HotspotsShell({
  helpRequests,
  feeders,
  initialVolunteers,
}: HotspotsShellProps) {
  const [volunteers, setVolunteers] = useState(initialVolunteers);
  const [volunteersLoading, setVolunteersLoading] = useState(false);
  const [volunteersFetched, setVolunteersFetched] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadVolunteers() {
      setVolunteersLoading(true);
      try {
        const response = await fetch("/api/hotspots/volunteers");
        const payload = await response.json().catch(() => null);
        if (!cancelled && response.ok && Array.isArray(payload?.volunteers)) {
          setVolunteers(payload.volunteers);
        }
      } finally {
        if (!cancelled) {
          setVolunteersLoading(false);
          setVolunteersFetched(true);
        }
      }
    }

    loadVolunteers();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Tabs defaultValue="map" className="space-y-4">
      <TabsList>
        <TabsTrigger value="map">Map</TabsTrigger>
        <TabsTrigger value="table">Colonies table</TabsTrigger>
      </TabsList>

      <TabsContent value="map" className="mt-0">
        <HotspotsMap
          helpRequests={helpRequests}
          volunteers={volunteers}
          feeders={feeders}
          volunteersLoading={volunteersLoading && !volunteersFetched}
        />
      </TabsContent>

      <TabsContent value="table" className="mt-0">
        <HotspotsColoniesTable helpRequests={helpRequests} />
      </TabsContent>
    </Tabs>
  );
}
