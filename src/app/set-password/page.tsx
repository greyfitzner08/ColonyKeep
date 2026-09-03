"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/branding/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    const response = await fetch("/api/auth/complete-password-change", { method: "POST" });
    const result = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setError(result?.error ?? "Password saved, but account could not be updated. Try again.");
      return;
    }

    setSuccess(true);
  }

  function goToDashboard() {
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="mb-2 inline-flex justify-center text-primary">
            <BrandMark nameClassName="text-xl text-primary" />
          </Link>
          {success ? (
            <>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
                <CheckCircle2 className="h-7 w-7" aria-hidden />
              </div>
              <CardTitle>Password updated</CardTitle>
              <CardDescription>
                Your password was changed successfully. You can continue to the volunteer dashboard.
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle>Create Your Password</CardTitle>
              <CardDescription>
                Choose a new password to replace your temporary one. You must do this before using the
                portal.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {success ? (
            <Button type="button" className="w-full" onClick={goToDashboard}>
              Go to dashboard
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Password</Label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : "Create Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
