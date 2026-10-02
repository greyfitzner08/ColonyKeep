"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdoptableCatsManager } from "@/components/adoption/adoptable-cats-manager";
import { VetCareDueBanner } from "@/components/adoption/vet-care-due-banner";
import { RescueAboutEditor } from "@/components/adoption/entrance-about-editor";
import { EntranceReviewManager } from "@/components/adoption/entrance-review-manager";
import { Button } from "@/components/ui/button";
import type { AdoptionApplicationLink } from "@/lib/adoption/application";
import { collectVetCareDueAlerts, type AdoptionEntranceApplication } from "@/lib/adoption/entrance";
import type { AdoptableCat } from "@/lib/adoption/constants";

type Section = "cats" | "rescue" | "about";

export function AdoptableCatsWorkspace({
  cats,
  applications,
  adoptionApplications,
  initialSection,
  aboutMessage,
  buttonText,
  buttonUrl,
}: {
  cats: AdoptableCat[];
  applications: AdoptionEntranceApplication[];
  adoptionApplications: AdoptionApplicationLink[];
  initialSection: Section;
  aboutMessage: string;
  buttonText: string;
  buttonUrl: string | null;
}) {
  const [section, setSection] = useState<Section>(initialSection);
  const openApplications = applications.filter((application) => application.status !== "approved");
  const pending = openApplications.filter((application) => application.status === "pending").length;
  const vetCareDue = useMemo(() => collectVetCareDueAlerts(applications), [applications]);

  const tabs: { id: Section; label: string }[] = [
    { id: "cats", label: "Cats" },
    { id: "rescue", label: pending > 0 ? `Rescue applications (${pending})` : "Rescue applications" },
    { id: "about", label: "About us" },
  ];

  return (
    <div className="space-y-6">
      <VetCareDueBanner alerts={vetCareDue} applications={applications} />
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

      {section === "cats" && (
        <AdoptableCatsManager
          cats={cats}
          applications={applications}
          adoptionApplications={adoptionApplications}
        />
      )}

      {section === "rescue" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Cats waiting for a decision, and cats that were declined. Approving a cat lists it under Cats.
            </p>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/adoption-entrance" target="_blank">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Rescue form
              </Link>
            </Button>
          </div>
          <EntranceReviewManager
            applications={openApplications}
            onApproved={() => setSection("cats")}
          />
        </div>
      )}

      {section === "about" && (
        <RescueAboutEditor
          initialMessage={aboutMessage}
          initialButtonText={buttonText}
          initialButtonUrl={buttonUrl}
        />
      )}
    </div>
  );
}
