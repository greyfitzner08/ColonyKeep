import Link from "next/link";
import { BrandMark } from "@/components/branding/brand-mark";
import { OrgIdentity, OrgJsonLd } from "@/components/public/org-identity";
import { Button } from "@/components/ui/button";
import { ORG_LEGAL_NAME, ORG_WEBSITE } from "@/lib/org";

export function PublicPortalHome() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-4 py-12">
      <OrgJsonLd />
      <div className="space-y-3 text-center">
        <BrandMark nameClassName="text-2xl text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">ColonyKeep volunteer portal</h1>
        <p className="text-muted-foreground">
          Case management for {ORG_LEGAL_NAME} volunteers. If you need TNVR help, use the public
          request form — you do not need an account.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href="/request">Report community cats</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Volunteer sign in</Link>
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Looking for the public website?{" "}
        <a href={ORG_WEBSITE} className="text-primary underline underline-offset-2" rel="noopener noreferrer">
          {ORG_WEBSITE.replace("https://", "")}
        </a>
      </p>

      <OrgIdentity />
    </main>
  );
}
