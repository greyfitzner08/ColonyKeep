/**
 * One-off: create login accounts for intake claim holders who were missing profiles.
 * Run: npx tsx scripts/create-missing-claim-holder-accounts.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("/*")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const tempPassword = process.env.DEFAULT_VOLUNTEER_PASSWORD?.trim() || "FeralFelines123!";

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const service = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PEOPLE: Array<{
  email: string;
  full_name: string;
  phone?: string;
  volunteer_roles: string[];
  platform_role: "volunteer" | "inquiry_team";
}> = [
  {
    email: "advocatingforanimalseverywhere@gmail.com",
    full_name: "Advocating For Animals Everywhere",
    volunteer_roles: ["intake_representative"],
    platform_role: "inquiry_team",
  },
  {
    email: "alma6534@gmail.com",
    full_name: "Alma",
    volunteer_roles: ["intake_representative"],
    platform_role: "inquiry_team",
  },
  {
    email: "kelliegordon98@gmail.com",
    full_name: "Kellie Gordon",
    volunteer_roles: ["intake_representative"],
    platform_role: "inquiry_team",
  },
  {
    email: "lizzy.dahlen@gmail.com",
    full_name: "Lizzy Dahlen",
    volunteer_roles: ["intake_representative"],
    platform_role: "inquiry_team",
  },
  {
    email: "sheilawinter00@gmail.com",
    full_name: "Sheila Winter",
    phone: "704-293-7798",
    volunteer_roles: ["intake_representative", "transporter"],
    platform_role: "inquiry_team",
  },
];

async function findAuthUserId(email: string): Promise<string | null> {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data.users.length) break;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match?.id) return match.id;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function ensurePerson(person: (typeof PEOPLE)[number]) {
  const email = person.email.toLowerCase();
  console.log(`\n→ ${email}`);

  let userId = await findAuthUserId(email);
  let createdAuth = false;

  if (!userId) {
    const createResult = await service.auth.admin.createUser({
      email,
      email_confirm: true,
      password: tempPassword,
      user_metadata: { full_name: person.full_name },
    });
    if (createResult.error) {
      throw new Error(`auth.createUser failed: ${createResult.error.message}`);
    }
    userId = createResult.data.user?.id ?? (await findAuthUserId(email));
    createdAuth = true;
    console.log(`  created auth user ${userId}`);
  } else {
    console.log(`  auth user already exists ${userId}`);
  }

  if (!userId) throw new Error("No auth user id");

  const { data: existingProfile } = await service
    .from("profiles")
    .select("id, role, volunteer_roles")
    .eq("id", userId)
    .maybeSingle();

  if (existingProfile) {
    const mergedRoles = Array.from(
      new Set([...(existingProfile.volunteer_roles ?? []), ...person.volunteer_roles])
    );
    const { error } = await service
      .from("profiles")
      .update({
        email,
        full_name: person.full_name,
        phone: person.phone ?? null,
        role: person.platform_role,
        volunteer_roles: mergedRoles,
        must_change_password: createdAuth ? true : undefined,
      })
      .eq("id", userId);
    if (error) throw new Error(`profile update failed: ${error.message}`);
    console.log(`  updated profile as ${person.platform_role}`);
  } else {
    const { error } = await service.from("profiles").insert({
      id: userId,
      email,
      full_name: person.full_name,
      phone: person.phone ?? null,
      role: person.platform_role,
      volunteer_roles: person.volunteer_roles,
      must_change_password: true,
    });
    if (error) throw new Error(`profile insert failed: ${error.message}`);
    console.log(`  created profile as ${person.platform_role}`);
  }

  const { data: existingApp } = await service
    .from("volunteer_applications")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  if (existingApp) {
    const { error } = await service
      .from("volunteer_applications")
      .update({
        status: "approved",
        full_name: person.full_name,
        phone: person.phone ?? null,
        roles_requested: person.volunteer_roles,
        reviewed_at: new Date().toISOString(),
        admin_notes: "Account backfilled for historical intake claim holder",
      })
      .eq("id", existingApp.id);
    if (error) throw new Error(`application update failed: ${error.message}`);
    console.log(`  approved existing application ${existingApp.id}`);
  } else {
    const { error } = await service.from("volunteer_applications").insert({
      status: "approved",
      full_name: person.full_name,
      email,
      phone: person.phone ?? "000-000-0000",
      birthday: "1990-01-01",
      roles_requested: person.volunteer_roles,
      why_volunteer: "Account backfilled for historical intake claim holder",
      imported_via_csv: true,
      liability_waiver_signed: false,
      policy_signed: false,
      reviewed_at: new Date().toISOString(),
      admin_notes: "Account backfilled for historical intake claim holder",
    });
    if (error) throw new Error(`application insert failed: ${error.message}`);
    console.log("  created approved application");
  }

  const { error: claimNameError, count } = await service
    .from("help_requests")
    .update({ claimed_by_name: person.full_name }, { count: "exact" })
    .eq("claimed_by_email", email);
  if (claimNameError) {
    console.warn(`  could not refresh claim names: ${claimNameError.message}`);
  } else {
    console.log(`  refreshed claimed_by_name on ${count ?? "?"} cases`);
  }

  return { email, userId, createdAuth, full_name: person.full_name };
}

async function main() {
  const results = [];
  for (const person of PEOPLE) {
    results.push(await ensurePerson(person));
  }

  console.log("\nDone.");
  console.log(`Temp password for new logins: ${tempPassword}`);
  console.log("New users must change password on first sign-in (must_change_password=true).");
  console.log(
    "Resend is not configured locally — share the temp password with each person, or reset from Volunteers admin."
  );
  for (const row of results) {
    console.log(`- ${row.full_name} <${row.email}> ${row.createdAuth ? "(new login)" : "(existing auth)"}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
