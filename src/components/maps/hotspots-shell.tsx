"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HotspotsColoniesTable } from "@/components/maps/hotspots-colonies-table";
import { HotspotsGeocodeBackfill } from "@/components/maps/hotspots-geocode-backfill";
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
  isAdmin?: boolean;
  canEditColonyAddress?: boolean;
}

export function HotspotsShell({
  helpRequests: initialHelpRequests,
  feeders,
  initialVolunteers,
  isAdmin = false,
  canEditColonyAddress = false,
}: HotspotsShellProps) {
  const [helpRequests, setHelpRequests] = useState(initialHelpRequests);
  const [volunteers, setVolunteers] = useState(initialVolunteers);
  const [volunteersLoading, setVolunteersLoading] = useState(false);
  const [volunteersFetched, setVolunteersFetched] = useState(false);
  const [coloniesLoading, setColoniesLoading] = useState(false);

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

    async function loadColonies() {
      setColoniesLoading(true);
      try {
        const response = await fetch("/api/hotspots/colonies");
        const payload = await response.json().catch(() => null);
        if (!cancelled && response.ok && Array.isArray(payload?.helpRequests)) {
          setHelpRequests(payload.helpRequests);
        }
      } finally {
        if (!cancelled) {
          setColoniesLoading(false);
        }
      }
    }

    void loadVolunteers();
    void loadColonies();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleHelpRequestUpdated(updated: HelpRequest) {
    setHelpRequests((current) =>
      current.map((hr) => (hr.id === updated.id ? { ...hr, ...updated } : hr))
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <HotspotsGeocodeBackfill
          helpRequests={helpRequests}
          onHelpRequestsChange={(updater) => setHelpRequests(updater)}
        />
      )}

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
          volunteersLoading={(volunteersLoading && !volunteersFetched) || coloniesLoading}
          canEditColonyAddress={canEditColonyAddress}
          onHelpRequestUpdated={handleHelpRequestUpdated}
        />
      </TabsContent>

      <TabsContent value="table" className="mt-0">
        <HotspotsColoniesTable helpRequests={helpRequests} />
      </TabsContent>
    </Tabs>
    </div>
  );
}
