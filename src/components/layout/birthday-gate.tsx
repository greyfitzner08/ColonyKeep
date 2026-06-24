"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cake } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BirthdayGateProps {
  userName: string;
}

export function BirthdayGate({ userName }: BirthdayGateProps) {
  const router = useRouter();
  const [birthday, setBirthday] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!birthday) return;

    setSaving(true);
    setError(null);
    const response = await fetch("/api/profile/birthday", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthday }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setError(result?.error ?? "Unable to save birthday");
      return;
    }

    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Cake className="mx-auto h-10 w-10 text-pink-500 mb-2" />
          <CardTitle>Add your birthday</CardTitle>
          <CardDescription>
            Hi {userName}! We use birthdays for team feed celebrations and upcoming birthday banners.
            Your birth year is kept private — only month and day are shared with the team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-birthday">Birthday (required)</Label>
              <Input
                id="profile-birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving || !birthday}>
              {saving ? "Saving…" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
