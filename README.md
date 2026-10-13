# TNVR Colony Management Platform

A full-stack platform for volunteer rescue organizations managing Trap-Neuter-Vaccinate-Return (TNVR) cat colony operations.

## Tech Stack

- **Next.js 15** (App Router) + TypeScript
- **Supabase** (PostgreSQL, Auth, RLS, Storage)
- **Tailwind CSS** + **shadcn/ui** + **Lucide icons**
- **Leaflet** for colony hotspot maps
- **Recharts** for volunteer impact charts
- **Google Maps Places API** for address autocomplete

## Requirements

- Node.js **20+**
- A [Supabase](https://supabase.com) project
- Optional: Google Maps API key (server key without HTTP referrer restrictions)

## Setup

### 1. Install dependencies

```bash
cd ~/Projects/tnvr-platform
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in your Supabase URL/keys, and optionally a Google Maps key.

The app does not send email. Copy addresses from Clinic Events → Manage bookings and send messages by hand.

### 3. Run database migration

Apply migrations under `supabase/migrations/` via the Supabase SQL editor, CLI, or linked project:

```bash
npx supabase db push
```

### 4. Create an admin user

1. Sign up a user via Supabase Auth (or the Supabase dashboard)
2. Set their role in the `profiles` table:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'you@example.com';
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Product flags

Temporary UI gates live in `src/lib/features.ts`:

| Flag | Current | Effect |
|------|---------|--------|
| `APPOINTMENTS_UI_ENABLED` | `false` | Hides Appointments nav/page and related case tab |
| `SHIFT_SIGNUPS_UI_ENABLED` | `false` | Hides shift sign-up rows under Events; calendar remains |

## Public Pages (no login)

| Route | Description |
|-------|-------------|
| `/request` | Community inquiry / colony request form (ZIP assign, Trap School tag, after-submit resources) |
| `/volunteer-signup` | Volunteer application |
| `/clinic-booking` | Public clinic event booking |
| `/update-case` | Public case progress updates |

## Internal Pages (login + role required)

| Route | Notes |
|-------|-------|
| `/` | Dashboard — all approved users |
| `/trap-queue` | TNVR Team + Admin — Unclaimed / My claims |
| `/hotspots` | TNVR Team + Admin |
| `/equipment` | TNVR Team + Admin |
| `/clinics` | Admin |
| `/clinic-events` | Admin |
| `/volunteers` | Admin |
| `/shift-board` | **Events** calendar — all volunteers |
| `/team-feed` | All volunteers |
| `/team-directory` | Adult volunteers + staff (contact fields opt-in) |
| `/my-impact` | All volunteers |
| `/resources` | Handbooks, SOPs, walkthroughs |
| `/reports` | Admin |
| `/admin` | Admin (includes Inquiry form custom fields) |
| `/appointments` | Hidden while `APPOINTMENTS_UI_ENABLED` is false |

## Key Features

- **Inquiry form**: public `/request` with How you can help, how-heard dropdown, ZIP team assign, Trap School tag (≤5 cats+kittens), and admin-configured after-submit resource paths
- **Trap Queue**: Unclaimed vs My claims; defaults to My claims when the user has claims; Filters; kitten/adult/total columns
- **Contact privacy**: directory & map visibility opt-in (hidden until the user shares)
- **RLS policies**: Row-level security on all tables
- **Volunteer gating**: Unapproved users see application pending screen
- **Birthday announcements**: Cron endpoint at `/api/cron/birthdays`
- **Case numbers**: Auto-generated as `CASE-00001`, `CASE-00002`, etc.
- **Walkthroughs**: Quick page tour + role-based advanced tracks from Resources

## Cron Jobs

Set up a daily cron (e.g. Vercel Cron) to hit:

```
GET /api/cron/birthdays
Authorization: Bearer <CRON_SECRET>
```

## Design

- Primary: `hsl(162 63% 35%)` (nature green)
- Sidebar: `hsl(162 40% 12%)` (dark green)
