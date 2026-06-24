import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Report a Cat Colony — TNVR Rescue",
  description: "Public community form to request help with a cat colony",
};

export default function RequestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
