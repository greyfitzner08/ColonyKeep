import { Button } from "@/components/ui/button";
import { INTAKE_COMMUNICATIONS_NOTICE } from "@/lib/constants";
import { intakeAboutPlainText, sanitizeIntakeAboutHtml } from "@/lib/intake-about-html";

export function AboutUsStep({
  message,
  donateUrl,
  donateText,
  description = "A few things to know before you tell us about the colony.",
  allowLinks = false,
  matchEditorSpacing = false,
  communicationsNotice = true,
}: {
  message: string;
  donateUrl: string | null;
  donateText: string;
  description?: string;
  allowLinks?: boolean;
  /** Use the line height saved in the text, without extra space between paragraphs. */
  matchEditorSpacing?: boolean;
  /** Colony requests append a consent line when the saved text does not already include one. */
  communicationsNotice?: boolean;
}) {
  const sanitized = sanitizeIntakeAboutHtml(message, { allowLinks });
  const html = communicationsNotice
    ? sanitized
    : sanitized.replace(
        /<p[^>]*>\s*By submitting a request for help, you agree to receive occasional communications from Friends of Feral Felines via email\.\s*<\/p>/gi,
        ""
      );
  const includesConsent = /occasional communications/i.test(intakeAboutPlainText(message));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">About us</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div
        className={
          matchEditorSpacing
            ? "text-sm leading-[1.15] text-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_li]:my-0 [&_p]:my-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
            : "space-y-3 text-sm leading-relaxed text-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_li+li]:mt-1 [&_p+p]:mt-3 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
        }
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {communicationsNotice && !includesConsent && (
        <p className="text-sm leading-relaxed text-foreground">{INTAKE_COMMUNICATIONS_NOTICE}</p>
      )}
      {donateUrl && (
        <Button type="button" asChild>
          <a href={donateUrl} target="_blank" rel="noopener noreferrer">
            {donateText || "Continue"}
          </a>
        </Button>
      )}
    </div>
  );
}
