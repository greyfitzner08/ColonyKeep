/** Default handbook content for the Platform User Flows resource (seeded into library_documents). */
export const PLATFORM_USER_FLOWS_MARKDOWN = `# ColonyKeep user flows — start to finish

This guide explains how access works in the app: a **platform role** (Administrator / Inquiry Team / TNVR Team / Volunteer) plus optional **volunteer roles** (trapper, clinic coordination, event volunteer, etc.) that unlock more tools.

---

## 1. Getting into the system

### Apply (public)
1. Submit **Volunteer Signup**.
2. Application sits in **Admin → Volunteers** as pending (or follow-up / rejected / inactive).

### Admin approves
1. Admin opens the applicant → sets **volunteer roles**, optional **trap team**, optional **platform role**.
2. **Approve / Save** creates (or restores) their login and profile.
3. Inactive accounts cannot sign in until re-approved.

### First login
1. User signs in at **Login**.
2. Lands on **Dashboard**.
3. Sidebar shows only routes their permissions allow (**Home / Operations / Clinics / Team / Resources / Administration**).
4. Optional: platform tour from **Resources** (quick tour of visible pages, or advanced track by role).

### Ongoing personal setup
- **My Profile** — contact info, birthday, volunteer interests, certificates.
- **Team Feed** — announcements.
- **My Impact** — history of cases/shifts they touched.
- **Resources** — SOPs (filtered by platform role; onboarding docs for everyone).

---

## 2. Shared case lifecycle (across roles)

~~~
Public / intake request
    → Inquiry Queue (review, claim, gather info)
    → Route to trap team
    → Trap Queue (claim, trap, transport, recovery)
    → Appointments (reserve clinic slots, link to case/cats)
    → Clinic day + log results
    → Complete / close
~~~

**Claim rule:** Inquiry, TNVR Team, and Volunteers must **claim** a case before editing. Admins can edit without claiming.

---

## 3. Administrator

**Job:** Configure people and the whole pipeline; unblock others.

### After login
Dashboard shows org-wide work; sidebar includes everything (queues, clinics, volunteers, reports, admin).

### Typical loop
1. **Volunteers** — approve applicants, assign roles/teams, merge duplicates, reopen inactive.
2. **Inquiry Queue** — oversee early cases; claim/edit if needed.
3. **Trap Queue / Hotspots / Equipment** — support field ops.
4. **Clinics → Appointments / Clinic Events** — partners, slots, public events.
5. **Shift Board** — create events/positions/shifts for volunteers.
6. **Team Feed / Reports / Admin** — communicate, measure, brand/settings/teams.

### Caseload
Not a personal queue; they supervise and fix access. Work history still appears under **My Impact** / dashboard when they touch cases.

---

## 4. Inquiry Team

**Job:** First contact on colony help requests; hand off ready cases to trap teams. Inquiry does **not** close field cases as their main path.

### After login
Dashboard emphasizes **My Cases** (claimed inquiry work), overdue follow-ups, work history.

### Day-to-day
1. Open **Inquiry Queue**.
2. **Claim** a new/under-review case.
3. Review feeder/colony details, notes, follow-up dates.
4. Statuses like needs more info / under review while gathering data.
5. When ready → **route to trap team** (leaves inquiry queue).
6. Optional: peek **Trap Queue** after handoff; use **Hotspots** for geography.
7. **Team Feed** for coordination; **Shift Board** if they also staff events.
8. **My work history** (inquiry) for past cases that left the queue (view-oriented).

### Caseload management
- Active load = cases **claimed by them** still in intake statuses.
- Dashboard + queue filters are the control surface; unclaim when handing off or stepping away.

---

## 5. TNVR Team / Trap team lead

**Job:** Run field work for assigned teams — trap, transport, recovery, clinic booking, gear.

### After login
Dashboard shows team cases, personally claimed cases, shifts, pending clinic follow-ups when relevant.

### Day-to-day
1. **Trap Queue** — primary board (team-assigned + personally claimed).
2. **Claim** before editing.
3. Advance workflow (routed → claimed → appointment needed/reserved → trapped → transported → checked in → complete).
4. **Hotspots** for route/colony planning.
5. **Equipment** — check traps in/out (doesn’t auto-return when a case closes).
6. **Appointments** — reserve slots, link cases/cats; log clinic results after.
7. **Shift Board** for event staffing; **Team Directory** for teammates.
8. May view **Inquiry Queue** for context on where cases came from (not their main inbox).

### Caseload management
- Team scope via **assigned trap team** + personal claims.
- Dashboard trap-team panel + Trap Queue views (team / mine / unassigned depending on filters).

---

## 6. Clinic Coordination

Volunteer roles: **Clinic Coordination** or **Colony Support** (usually on a Volunteer platform account).

**Job:** Clinic partners, appointment capacity, public clinic events — not necessarily owning trap cases.

### After login
Access to **Clinics**, **Clinic Events**, **Appointments**, often **Shift Board**.

### Day-to-day
1. **Clinics** — maintain partner clinic records.
2. **Appointments** — add one-off or recurring available slots; monitor reservations.
3. **Clinic Events** — public booking events, capacity, pricing/messaging.
4. **Shift Board** — staff clinic/event days.
5. Optional awareness of **Trap Queue** demand; **Resources** for SOPs.

### Caseload
Capacity and event calendars, not an inquiry caseload. Case linkage happens when field people reserve appointments against help requests.

---

## 7. Field volunteers

Examples: trapper, trap loaner, transporter, recovery (+ sometimes intake representative).

**Job:** Execute claimed field work; keep status and gear accurate for the next person.

### After login
Case-worker access: **Inquiry** (if intake-capable), **Trap Queue**, **Hotspots**, **Appointments**, **Equipment**, shifts, feed, impact.

### Day-to-day
1. Dashboard → active / claimed work.
2. **Trap Queue** — claim, update trapping/transport/recovery.
3. **Equipment** — check gear out/in.
4. **Appointments** — reserve/confirm clinic time with lead coordination.
5. Optional **Intake** if they support first contact (same claim-before-edit rule).
6. Optional **Shift Board** for event days (separate from case assignment).
7. **My Impact** for personal record.

### Caseload
Personal claims (+ team assignment if on a trap team). Don’t edit cases claimed by someone else.

---

## 8. Event / community volunteers

Examples: event volunteer, photographer, crafter, snack patrol, outreach, etc. (no TNVR case interests).

**Job:** Staff events and community work — not trap queues.

### After login
Core: Dashboard, **Shift Board**, **Team Feed**, **Resources**, **Profile**, **My Impact**; **Team Directory** if adult (birthday set).

### Day-to-day
1. **Shift Board** — open event → position → dated shift → **Sign Up**.
2. Confirm on **Dashboard** (upcoming shifts).
3. Check **Team Feed** before the day.
4. Read **Resources**; keep **Profile** roles/contact current.
5. **My Impact** after helping.

### Caseload
Shift claims, not cases. Signing up for a shift does **not** assign a trap case.

---

## 9. Minimal / general volunteer

Few interests, or not yet fully configured.

### After login
Dashboard, Feed, Resources, Profile, Impact; Shift Board only if eligible.

### Day-to-day
Orient via tour → complete **Profile** (roles, birthday, certs) so admins can expand access → watch **Feed** → claim shifts if available.

---

## 10. Quick map: who owns which page?

| Area | Primary owners |
| --- | --- |
| Inquiry Queue | Inquiry Team, admins, intake-capable volunteers |
| Trap Queue | TNVR leads, field volunteers, admins |
| Hotspots | Case workers |
| Appointments | TNVR / clinic coord / field TNVR / admins |
| Clinics & Clinic Events | Clinic coordination, admins |
| Equipment | TNVR leads & TNVR volunteers, admins |
| Shift Board | Most staff/eligible volunteers; admins create |
| Volunteers / Admin / Reports | Admins |
| Team Feed / Resources / Profile / My Impact | Almost everyone with login |

---

## 11. Mental model for training

1. **People first** (roles unlock queues).
2. **Cases** move Inquiry → Trap → Clinic appointment → done.
3. **Events/shifts** are a parallel path.
4. **Claim** = ownership before edit (except admin).
5. **Dashboard** summarizes; **queues/calendars** are where work happens.
`;
