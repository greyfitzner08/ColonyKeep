import type { Metadata } from "next";
import { EntranceApplicationForm } from "@/components/adoption/entrance-application-form";

export const metadata: Metadata = {
  title: "Adoption Program Entrance Application",
};

export default function AdoptionEntrancePage() {
  return <EntranceApplicationForm />;
}
