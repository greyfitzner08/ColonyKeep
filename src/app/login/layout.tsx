import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Volunteer sign in — Friends of Feral Felines",
  description:
    "Sign in to the official ColonyKeep volunteer portal for Friends of Feral Felines. Approved volunteers only.",
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>{children}</Suspense>;
}
