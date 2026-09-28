"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdoptableCatsManager } from "@/components/adoption/adoptable-cats-manager";
import { RescueAboutEditor } from "@/components/adoption/entrance-about-editor";
import { EntranceReviewManager } from "@/components/adoption/entrance-review-manager";
import { Button } from "@/components/ui/button";
import type { RescueAboutLink } from "@/lib/branding";
import type { AdoptionEntranceApplication } from "@/lib/adoption/entrance";
import type { AdoptableCat, AdoptionLocation } from "@/lib/adoption/constants";

type Section = "cats" | "rescue" | "about";

export function AdoptableCatsWorkspace({
  cats,
  locations,
  applications,
  initialSection,
  aboutMessage,
  buttonText,
  buttonUrl,
  links,
}: {
  cats: AdoptableCat[];
  locations: AdoptionLocation[];
  applications: AdoptionEntranceApplication[];
  initialSection: Section;
  aboutMessage: string;
  buttonText: string;
  buttonUrl: string | null;
  links: RescueAboutLink[];
}) {
  const [section, setSection] = useState<Section>(initialSection);
  const pending = applications.filter((application) => application.status === "pending").length;

  const tabs: { id: Section; label: string }[] = [
    { id: "cats", label: "Cats" },
    { id: "rescue", label: pending > 0 ? `Rescue applications (${pending})` : "Rescue applications" },
    { id: "about", label: "About us" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Adoptable cats">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            role="tab"
            aria-selected={section === tab.id}
            variant={section === tab.id ? "default" : "outline"}
            onClick={() => setSection(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {section === "cats" && <AdoptableCatsManager cats={cats} locations={locations} />}

      {section === "rescue" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Cats submitted through the rescue application. Approving one adds it to Adoptable Cats.
            </p>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/adoption-entrance" target="_blank">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Rescue form
              </Link>
            </Button>
          </div>
          <EntranceReviewManager applications={applications} />
        </div>
      )}

      {section === "about" && (
        <RescueAboutEditor
          initialMessage={aboutMessage}
          initialButtonText={buttonText}
          initialButtonUrl={buttonUrl}
          initialLinks={links}
        />
      )}
    </div>
  );
}
