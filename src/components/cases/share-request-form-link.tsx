import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareRequestFormLinkProps {
  requestFormUrl: string;
}

export function ShareRequestFormLink({ requestFormUrl }: ShareRequestFormLinkProps) {
  return (
    <Button type="button" variant="outline" size="sm" asChild>
      <a href={requestFormUrl} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="mr-1.5 h-4 w-4" />
        Request form
      </a>
    </Button>
  );
}
