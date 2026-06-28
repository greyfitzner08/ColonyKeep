import { getAppProfile } from "@/lib/auth";
import { VolunteerProfileContactPanel } from "@/components/volunteers/volunteer-profile-contact-panel";
import { VolunteerContactPrivacyPanel } from "@/components/volunteers/volunteer-contact-privacy-panel";

export default async function ProfilePage() {
  const profile = await getAppProfile();
  if (!profile) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">
          Update your contact details if you move or change phone numbers or email.
        </p>
      </div>
      <VolunteerProfileContactPanel profile={profile} />
      <VolunteerContactPrivacyPanel profile={profile} />
    </div>
  );
}
