import { Button } from "@/components/ui/button";
import type { RescueAboutLink } from "@/lib/branding";
import { INTAKE_COMMUNICATIONS_NOTICE } from "@/lib/constants";
import { intakeAboutPlainText, sanitizeIntakeAboutHtml } from "@/lib/intake-about-html";

export function AboutUsStep({
  message,
  donateUrl,
  donateText,
  description = "A few things to know before you tell us about the colony.",
  links = [],
  allowLinks = false,
  matchEditorSpacing = false,
  buttonFirst = false,
}: {
  message: string;
  donateUrl: string | null;
  donateText: string;
  description?: string;
  links?: RescueAboutLink[];
  allowLinks?: boolean;
  /** Use the line height saved in the text, without extra space between paragraphs. */
  matchEditorSpacing?: boolean;
  /** Place the button and links above the long text so they stay in view. */
  buttonFirst?: boolean;
}) {
  const html = sanitizeIntakeAboutHtml(message, { allowLinks });
  const includesConsent = /occasional communications/i.test(intakeAboutPlainText(message));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">About us</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {buttonFirst && <AboutExtras donateUrl={donateUrl} donateText={donateText} links={links} />}
      <div
        className={
          matchEditorSpacing
            ? "text-sm leading-[1.15] text-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_li]:my-0 [&_p]:my-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
            : "space-y-3 text-sm leading-relaxed text-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_li+li]:mt-1 [&_p+p]:mt-3 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
        }
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {!includesConsent && (
        <p className="text-sm leading-relaxed text-foreground">{INTAKE_COMMUNICATIONS_NOTICE}</p>
      )}
      {!buttonFirst && <AboutExtras donateUrl={donateUrl} donateText={donateText} links={links} />}
    </div>
  );
}

function AboutExtras({
  donateUrl,
  donateText,
  links,
}: {
  donateUrl: string | null;
  donateText: string;
  links: RescueAboutLink[];
}) {
  if (!donateUrl && links.length === 0) return null;
  return (
    <>
      {donateUrl && (
        <Button type="button" asChild>
          <a href={donateUrl} target="_blank" rel="noopener noreferrer">
            {donateText || "Continue"}
          </a>
        </Button>
      )}
      {links.length > 0 && (
        <ul className="space-y-1.5 text-sm">
          {links.map((link) => (
            <li key={`${link.label}-${link.url}`}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-2"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
