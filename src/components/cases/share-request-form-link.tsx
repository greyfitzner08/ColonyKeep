import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareRequestFormLinkProps {
  requestFormUrl: string;
}

export function ShareRequestFormLink({ requestFormUrl }: ShareRequestFormLinkProps) {
  return (
    <Button type="button" variant="outline" size="sm" asChild>
      <a href={requestFormUrl} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="h-4 w-4 mr-2" />
        Open request form
      </a>
    </Button>
  );
}
