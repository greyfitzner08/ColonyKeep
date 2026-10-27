import Link from "next/link";
import {
  APP_PUBLIC_URL,
  ORG_CONTACT_EMAIL,
  ORG_EIN,
  ORG_LEGAL_NAME,
  ORG_MAILING_ADDRESS,
  ORG_WEBSITE,
} from "@/lib/org";

export function OrgIdentity() {
  return (
    <div className="space-y-2 text-center text-sm text-muted-foreground">
      <p>
        Official volunteer portal for{" "}
        <a
          href={ORG_WEBSITE}
          className="font-medium text-primary underline underline-offset-2"
          rel="noopener noreferrer"
        >
          {ORG_LEGAL_NAME}
        </a>
        , a 501(c)(3) nonprofit in Charlotte, NC (EIN {ORG_EIN}).
      </p>
      <p>
        This site ({APP_PUBLIC_URL.replace("https://", "")}) is ColonyKeep, used by FFF
        volunteers to manage TNVR cases. We never ask for credit cards, bank passwords, or
        software downloads here.
      </p>
      <p>
        {ORG_MAILING_ADDRESS}
        {" · "}
        <a href={`mailto:${ORG_CONTACT_EMAIL}`} className="underline underline-offset-2">
          {ORG_CONTACT_EMAIL}
        </a>
      </p>
      <p>
        Need help with community cats?{" "}
        <Link href="/request" className="text-primary underline underline-offset-2">
          Report a colony
        </Link>
        . Not a volunteer yet?{" "}
        <Link href="/volunteer-signup" className="text-primary underline underline-offset-2">
          Apply here
        </Link>
        .
      </p>
    </div>
  );
}

export function OrgJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: ORG_LEGAL_NAME,
    url: ORG_WEBSITE,
    email: ORG_CONTACT_EMAIL,
    taxID: ORG_EIN,
    address: {
      "@type": "PostalAddress",
      streetAddress: "P.O. Box 473385",
      addressLocality: "Charlotte",
      addressRegion: "NC",
      postalCode: "28247-3385",
      addressCountry: "US",
    },
    sameAs: [APP_PUBLIC_URL, ORG_WEBSITE],
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
