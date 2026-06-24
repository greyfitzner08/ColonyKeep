import { Cat, Clock, LogIn } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function VolunteerGate() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Application Under Review</CardTitle>
          <CardDescription>
            Thank you for applying to volunteer with TNVR Rescue. Your application is being reviewed by our team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            You&apos;ll receive an email once your application is approved and you&apos;ll gain
            access to the volunteer portal.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Sign in
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/volunteer-signup">View Application Form</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/request">
                <Cat className="mr-2 h-4 w-4" />
                Report a Cat Colony
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
