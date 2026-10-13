/** Default handbook content for the Platform User Flows resource (seeded into library_documents). */
export const PLATFORM_USER_FLOWS_DOC_VERSION = "2026-10-13";

export const PLATFORM_USER_FLOWS_MARKDOWN = `<!-- flows-doc-version: ${PLATFORM_USER_FLOWS_DOC_VERSION} -->
# ColonyKeep user flows — start to finish

This guide explains how access works in the app. **Page access is controlled by platform role**, with one interest-based exception:

- **Administrator**
- **TNVR Team** (trap team lead)
- **Volunteer** (every volunteer sees the same core tools)

**Volunteer interests** (trapper, event volunteer, clinic coordination, etc.) are for staffing, labeling, and matching people to work. **Exception:** **Adoption Specialist** unlocks the **Adoption** nav (adoptable cats and adoption applications) after **adoption training** is verified and the interest is granted.

> **Note:** Some modules (internal Appointments calendar, event shift sign-up rows) may be temporarily hidden in the product. This guide matches what people see today and notes when a surface is optional/hidden.

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
- **My Profile** — contact info, birthday, volunteer interests, certificates, and **Directory & map visibility**.
- **Directory & map visibility** — phone, email, address, and map presence default to **hidden**. Turn on only what you want teammates to see.
- **Team Feed** — announcements.
- **My Impact** — history of cases (and shifts, when sign-ups are enabled) they touched.
- **Resources** — SOPs (filtered by platform role; onboarding docs for everyone) and walkthroughs.

---

## 2. Shared case lifecycle (across roles)

~~~
Public / community inquiry form (/request)
    → How you can help + colony size captured
    → Auto-assign trap team by colony ZIP
       Trap School tag when ≤5 cats + kittens combined
    → After submit: matched resource path (admin-configured)
    → Trap Queue — Unclaimed / My claims
    → Field work (trap, transport, recovery) + clinic day results on the case
    → Complete / close
~~~

**Claim rule:** TNVR Team must **claim** a case before editing. Admins can edit without claiming. Volunteers do not work case queues.

**Public form extras:**
- **How did you hear about us?** — dropdown (Facebook, Nextdoor, Instagram, Google, Friend/Family, Other + write-in).
- **After-submit resources** — Admin → Inquiry form custom fields defines ordered paths matched to How you can help answers and optional min/max total cats+kittens.

---

## 3. Administrator

**Job:** Configure people and the whole pipeline; unblock others.

### After login
Dashboard shows org-wide work; sidebar includes everything (queues, clinics, volunteers, reports, admin).

### Typical loop
1. **Volunteers** — approve applicants, assign interests/teams, set platform role, merge duplicates, reopen inactive. Minimize or **Snooze today** on pending role-change requests when the list is long.
2. **Trap Queue / Hotspots / Equipment** — support field ops; share the public request form from Trap Queue.
3. **Clinics / Clinic Events** — partners and public clinic booking days.
4. **Events** — shared team calendar (shift sign-up rows may be hidden while that feature is off).
5. **Admin → Inquiry form custom fields** — About us intro, donate button, and after-submit resource paths.
6. **Team Feed / Reports / Admin** — communicate, measure, brand/settings/teams.

### Caseload
Not a personal queue; they supervise and fix access. Work history still appears under **My Impact** / dashboard when they touch cases.

---

## 4. TNVR Team

**Job:** Run field work for assigned teams — trap, transport, recovery, clinic follow-up, gear. Small colonies (≤5 cats/kittens) are tagged **Trap School** on their ZIP team.

### After login
Dashboard shows team cases and personally claimed cases. Sidebar includes Trap Queue, Hotspots, Equipment, Events, and shared tools. (Internal Appointments UI may be hidden.)

### Day-to-day
1. **Trap Queue**
   - **Unclaimed** — open cases ready to claim, oldest first (others’ claims hidden by default).
   - **My claims** — cases you personally claimed.
   - Default focus: **My claims** if you have active claims, otherwise **Unclaimed**.
   - **Filters** — team scope, show others’ claims, Trap School only, layout/sort.
   - Columns include kitten, adult, and total counts.
2. **Claim** before editing.
3. Advance workflow through field statuses; log clinic results on the case when relevant.
4. **Hotspots** for route/colony planning (teammate pins only if they opted in).
5. **Equipment** — check traps in/out (doesn’t auto-return when a case closes).
6. **Events** for the shared calendar; **Team Directory** for teammates who shared contact info.

### Caseload management
- Team scope via **assigned trap team** + personal claims.
- Trap Queue focus toggles + Filters replace older “mine / all / unassigned” view names.

---

## 5. Volunteer

**Job:** Stay oriented via feed, resources, profile, and Events calendar. Same page access for every volunteer interest.

### After login
Core: Dashboard, **Events**, **Team Feed**, **Resources**, **Profile**, **My Impact**; **Team Directory** if adult (birthday set). No Trap Queue or Clinics unless the admin changes their **platform role**.

### Day-to-day
1. **Events** — browse the shared team calendar. (If shift sign-ups are enabled again: open event → position → dated shift → Sign Up.)
2. Check **Team Feed** for updates.
3. Read **Resources**; keep **Profile** interests/contact current.
4. Set **Directory & map visibility** only if you want phone, email, address, or map presence shared.
5. **My Impact** after helping.

### Caseload
Community/event participation, not trap cases. Interests help organizers know what you want to do; they do not change the sidebar.

---

## 6. Quick map: who owns which page?

| Area | Platform roles |
| --- | --- |
| Trap Queue | TNVR Team, Administrator |
| Hotspots | TNVR Team, Administrator |
| Clinics & Clinic Events | Administrator |
| Equipment | TNVR Team, Administrator |
| Events | Everyone with a login |
| Volunteers / Admin / Reports | Administrator |
| Inquiry form custom fields (Admin tab) | Administrator |
| Team Feed / Resources / Profile / My Impact | Everyone with a login |
| Team Directory | Adult volunteers + staff (contact fields opt-in) |

---

## 7. Mental model for training

1. **Platform role** = which pages you can open.
2. **Volunteer interests** = how you are staffed and labeled — not extra page unlocks (except Adoption Specialist).
3. **Cases** auto-assign to a trap team by ZIP (Trap School tag when ≤5 cats+kittens), then move through Trap Queue field work → clinic day results → done.
4. **Trap Queue focus** = Unclaimed vs My claims; Filters for scope; claim before edit (except admin).
5. **Events** is the shared calendar path for all volunteers (shift sign-ups optional when enabled).
6. **Contact sharing** is opt-in on My Profile.
7. **Dashboard** summarizes; **queues/calendars** are where work happens.
`;
