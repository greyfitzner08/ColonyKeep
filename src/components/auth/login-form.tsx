"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandMark } from "@/components/branding/brand-mark";
import { createClient } from "@/lib/supabase/client";
import {
  getVolunteerApplicationStatusByEmail,
  isVolunteerLoginBlockedStatus,
} from "@/lib/volunteers/login-access";
import Link from "next/link";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const urlError = searchParams.get("error");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      setLoading(false);
      const message = authError.message?.toLowerCase() ?? "";
      setError(
        message.includes("banned") || message.includes("disabled")
          ? "This volunteer account is inactive. Contact an admin to be re-approved."
          : authError.message
      );
      return;
    }

    const user = authData.user;
    const userEmail = user?.email ?? email;
    if (userEmail) {
      const applicationStatus = await getVolunteerApplicationStatusByEmail(supabase, userEmail);
      if (isVolunteerLoginBlockedStatus(applicationStatus)) {
        await supabase.auth.signOut();
        setLoading(false);
        setError("This volunteer account is inactive. Contact an admin to be re-approved.");
        return;
      }
    }

    setLoading(false);

    const userId = user?.id;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.must_change_password) {
        router.push("/set-password");
        router.refresh();
        return;
      }
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="mb-2 inline-flex justify-center text-primary">
            <BrandMark nameClassName="text-xl text-primary" />
          </Link>
          <CardTitle>Volunteer Login</CardTitle>
          <CardDescription>Sign in to access the volunteer portal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary underline underline-offset-2"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {(error || urlError === "inactive") && (
              <p className="text-sm text-destructive">
                {error ||
                  "This volunteer account is inactive. Contact an admin to be re-approved."}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Not a volunteer yet?{" "}
            <Link href="/volunteer-signup" className="text-primary underline">Apply here</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
