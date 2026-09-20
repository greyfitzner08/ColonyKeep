/** Default handbook content for the Platform User Flows resource (seeded into library_documents). */
export const PLATFORM_USER_FLOWS_MARKDOWN = `# ColonyKeep user flows — start to finish

This guide explains how access works in the app. **Page access is controlled by platform role**, with one interest-based exception:

- **Administrator**
- **TNVR Team** (trap team lead)
- **Volunteer** (every volunteer sees the same core tools)

**Volunteer interests** (trapper, event volunteer, clinic coordination, etc.) are for staffing, labeling, and matching people to shifts. **Exception:** **Adoption Specialist** unlocks the **Adoption** nav (adoptable cats and locations) after **adoption training** is verified and the interest is granted.

---

## 1. Getting into the system

### Apply (public)
1. Submit **Volunteer Signup**.
2. Application sits in **Admin → Volunteers** as pending (or follow-up / rejected / inactive).

### Admin approves
1. Admin opens the applicant → sets **volunteer interests** (for staffing), optional **trap team**, and **platform role** (what they can open in the app).
2. **Approve / Save** creates (or restores) their login and profile.
3. Inactive accounts cannot sign in until re-approved.

### First login
1. User signs in at **Login**.
2. Lands on **Dashboard**.
3. Sidebar shows only routes their **platform role** allows (**Home / Operations / Clinics / Team / Resources / Administration**).
4. Optional: platform tour from **Resources** (quick tour of visible pages, or advanced track by platform role).

### Ongoing personal setup
- **My Profile** — contact info, birthday, volunteer interests, certificates.
- **Team Feed** — announcements.
- **My Impact** — history of cases/shifts they touched.
- **Resources** — SOPs (filtered by platform role; onboarding docs for everyone).

---

## 2. Shared case lifecycle (across roles)

~~~
Public / community request form
    → Auto-assign trap team by colony ZIP
       (or Trap School when 5 or fewer cats/kittens are reported)
    → Trap Queue (claim, trap, transport, recovery)
    → Appointments (reserve clinic slots, link to case/cats)
    → Clinic day + log results
    → Complete / close
~~~

**Claim rule:** TNVR Team must **claim** a case before editing. Admins can edit without claiming. Volunteers do not work case queues.

---

## 3. Administrator

**Job:** Configure people and the whole pipeline; unblock others.

### After login
Dashboard shows org-wide work; sidebar includes everything (queues, clinics, volunteers, reports, admin).

### Typical loop
1. **Volunteers** — approve applicants, assign interests/teams, set platform role, merge duplicates, reopen inactive.
2. **Trap Queue / Hotspots / Equipment** — support field ops; share the public request form from Trap Queue.
3. **Clinics → Appointments / Clinic Events** — partners, slots, public events.
4. **Shift Board** — create events/positions/shifts for volunteers.
5. **Team Feed / Reports / Admin** — communicate, measure, brand/settings/teams.

### Caseload
Not a personal queue; they supervise and fix access. Work history still appears under **My Impact** / dashboard when they touch cases.

---

## 4. TNVR Team

**Job:** Run field work for assigned teams — trap, transport, recovery, clinic booking, gear. Includes **Trap School** for small colonies (≤5 cats/kittens).

### After login
Dashboard shows team cases, personally claimed cases, shifts, pending clinic follow-ups when relevant. Sidebar includes Trap Queue, Hotspots, Appointments, Equipment, Shift Board, and shared tools.

### Day-to-day
1. **Trap Queue** — primary board (team-assigned + personally claimed).
2. **Claim** before editing.
3. Advance workflow (routed → claimed → appointment needed/reserved → complete).
4. **Hotspots** for route/colony planning.
5. **Equipment** — check traps in/out (doesn’t auto-return when a case closes).
6. **Appointments** — reserve slots, link cases/cats; log clinic results after.
7. **Shift Board** for event staffing; **Team Directory** for teammates.

### Caseload management
- Team scope via **assigned trap team** + personal claims.
- Dashboard trap-team panel + Trap Queue views (team / mine / unassigned depending on filters).

---

## 5. Volunteer

**Job:** Staff events and community work; stay oriented via feed, resources, and profile. Same page access for every volunteer interest.

### After login
Core: Dashboard, **Shift Board**, **Team Feed**, **Resources**, **Profile**, **My Impact**; **Team Directory** if adult (birthday set). No Trap Queue, Clinics, or Appointments unless the admin changes their **platform role**.

### Day-to-day
1. **Shift Board** — open event → position → dated shift → **Sign Up** (or join waitlist).
2. Confirm on **Dashboard** (upcoming shifts).
3. Check **Team Feed** before the day.
4. Read **Resources**; keep **Profile** interests/contact current so admins can match you to the right shifts.
5. **My Impact** after helping.

### Caseload
Shift claims, not cases. Signing up for a shift does **not** assign a trap case. Interests help organizers know what you want to do; they do not change the sidebar.

---

## 6. Quick map: who owns which page?

| Area | Platform roles |
| --- | --- |
| Trap Queue | TNVR Team, Administrator |
| Hotspots | TNVR Team, Administrator |
| Appointments | TNVR Team, Administrator |
| Clinics & Clinic Events | Administrator |
| Equipment | TNVR Team, Administrator |
| Shift Board | Everyone with a login |
| Volunteers / Admin / Reports | Administrator |
| Team Feed / Resources / Profile / My Impact | Everyone with a login |

---

## 7. Mental model for training

1. **Platform role** = which pages you can open.
2. **Volunteer interests** = how you are staffed and labeled — not extra page unlocks.
3. **Cases** auto-assign to a trap team (or Trap School), then move Trap → Clinic appointment → done.
4. **Events/shifts** are a parallel path for all volunteers.
5. **Claim** = ownership before edit (except admin).
6. **Dashboard** summarizes; **queues/calendars** are where work happens.
`;
