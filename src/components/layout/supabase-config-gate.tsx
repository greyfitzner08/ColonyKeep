import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SupabaseConfigGate() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Supabase is not configured</CardTitle>
          <CardDescription>
            This deployment is missing the Supabase environment variables required to load the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Add these variables in Vercel for this environment, then redeploy:</p>
          <ul className="list-disc pl-5">
            <li><code>NEXT_PUBLIC_SUPABASE_URL</code> or <code>SUPABASE_URL</code></li>
            <li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> or <code>SUPABASE_PUBLISHABLE_KEY</code></li>
            <li><code>SUPABASE_SERVICE_ROLE_KEY</code> or <code>SUPABASE_SECRET_KEY</code></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
