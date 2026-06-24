# TNVR Colony Management Platform

A full-stack platform for volunteer rescue organizations managing Trap-Neuter-Vaccinate-Return (TNVR) cat colony operations.

## Tech Stack

- **Next.js 15** (App Router) + TypeScript
- **Supabase** (PostgreSQL, Auth, RLS, Storage)
- **Tailwind CSS** + **shadcn/ui** + **Lucide icons**
- **Leaflet** for colony hotspot maps
- **Recharts** for volunteer impact charts
- **Resend** for transactional email
- **Google Maps Places API** for address autocomplete

## Requirements

- Node.js **20+**
- A [Supabase](https://supabase.com) project
- Optional: Resend API key, Google Maps API key

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

Fill in your Supabase URL/keys, and optionally Resend + Google Maps keys.

### 3. Run database migration

Apply the schema in `supabase/migrations/001_initial_schema.sql` via the Supabase SQL editor or CLI:

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

## Public Pages (no login)

| Route | Description |
|-------|-------------|
| `/request` | Civilian colony intake form |
| `/volunteer-signup` | Volunteer application |
| `/clinic-booking` | Public clinic event booking |

## Internal Pages (login + role required)

| Route | Roles |
|-------|-------|
| `/` | All approved volunteers |
| `/intake` | admin, inquiry_team, trap_team_lead |
| `/case/:id` | Staff + assigned team |
| `/trap-queue` | trap roles, volunteers |
| `/appointments` | clinic_coordination, trap leads |
| `/clinics` | admin, clinic_coordination |
| `/hotspots` | Most staff roles |
| `/volunteers` | admin |
| `/shift-board` | All volunteers |
| `/team-feed` | All volunteers |
| `/my-impact` | All volunteers |
| `/reports` | admin |
| `/admin` | admin |
| `/clinic-events` | admin, clinic_coordination |

## Key Features

- **Case workflow**: `new_intake` → `under_review` → ... → `closed`
- **Medical flag detection**: Auto-scans intake notes for injury/illness keywords
- **RLS policies**: Row-level security on all tables
- **Volunteer gating**: Unapproved users see application pending screen
- **Welcome email**: Sent on volunteer approval (via Resend)
- **Shift confirmation email**: Sent when claiming a shift
- **Appointment confirmation email**: Sent when reserving a clinic slot
- **Birthday announcements**: Cron endpoint at `/api/cron/birthdays`
- **Case numbers**: Auto-generated as `CASE-00001`, `CASE-00002`, etc.

## Cron Jobs

Set up a daily cron (e.g. Vercel Cron) to hit:

```
GET /api/cron/birthdays
Authorization: Bearer <CRON_SECRET>
```

## Design

- Primary: `hsl(162 63% 35%)` (nature green)
- Sidebar: `hsl(162 40% 12%)` (dark green)
- Font: Inter
