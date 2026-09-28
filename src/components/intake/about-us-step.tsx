import { Button } from "@/components/ui/button";
import { INTAKE_COMMUNICATIONS_NOTICE } from "@/lib/constants";
import { intakeAboutPlainText, sanitizeIntakeAboutHtml } from "@/lib/intake-about-html";

export function AboutUsStep({
  message,
  donateUrl,
  donateText,
  description = "A few things to know before you tell us about the colony.",
}: {
  message: string;
  donateUrl: string | null;
  donateText: string;
  description?: string;
}) {
  const html = sanitizeIntakeAboutHtml(message);
  const includesConsent = /occasional communications/i.test(intakeAboutPlainText(message));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">About us</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div
        className="space-y-3 text-sm leading-relaxed text-foreground [&_p+p]:mt-3"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {!includesConsent && (
        <p className="text-sm leading-relaxed text-foreground">{INTAKE_COMMUNICATIONS_NOTICE}</p>
      )}
      {donateUrl && (
        <Button type="button" asChild>
          <a href={donateUrl} target="_blank" rel="noopener noreferrer">
            {donateText}
          </a>
        </Button>
      )}
    </div>
  );
}
