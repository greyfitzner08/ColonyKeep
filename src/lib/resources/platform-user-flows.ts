/** Default handbook content for the Platform User Flows resource (seeded into library_documents). */
export const PLATFORM_USER_FLOWS_DOC_VERSION = "2026-10-16a";

export const PLATFORM_USER_FLOWS_MARKDOWN = `<!-- flows-doc-version: ${PLATFORM_USER_FLOWS_DOC_VERSION} -->
# ColonyKeep user flows — start to finish

This guide explains how access works in the app. **Page access is controlled by platform role**, with one interest-based exception:

- **Administrator**
- **TNVR Team** (trap team lead)
- **Volunteer** (every volunteer sees the same core tools)

**Volunteer interests** (trapper, event volunteer, clinic coordination, etc.) are for staffing, labeling, and matching people to work. **Exception:** **Adoption Specialist** unlocks the **Adoption** nav (adoptable cats and adoption applications) after **adoption training** is verified and the interest is granted.

> **Note:** Internal **Appointments** calendar and event **shift sign-up** rows are currently hidden. This guide matches what people see today.

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
- **Directory & map visibility** — phone, email, address, and map presence all **start hidden**. Turn on only what you want teammates to see.
- **Team Feed** — announcements (react with emoji; edit or delete your own posts; Enter starts a new line, use **Post to feed** to publish).
- **My Impact** — history of cases they touched.
- **Resources** — SOPs (filtered by platform role; onboarding docs for everyone) and walkthroughs.

---

## 2. Shared case lifecycle (across roles)

~~~
Public / community inquiry form (/request)
    → How you can help + colony size captured
    → Auto-assign trap team by colony ZIP
       Trap School tag when ≤5 cats + kittens combined
    → After submit: matched resource path (admin-configured)
    → Trap Queue — All Cases / My Cases
    → Field work (trap, transport, recovery) + clinic day results on the case
    → Complete / close
~~~

**Claim rule:** TNVR Team must **claim** a case before editing. Admins can edit without claiming, and can **Assign** / **Reassign** a case to a TNVR user. Volunteers do not work case queues.

**Public form extras:**
- **How did you hear about us?** — dropdown (Facebook, Nextdoor, Instagram, Google, Friend/Family, Other + write-in).
- **After-submit resources** — Admin → Inquiry form custom fields defines ordered paths. Each path has **Criteria** (How you can help Yes/No/Any + optional min/max total cats+kittens) and **Thank-you content** (title, message, buttons). First match wins; one path can be **Fallback**.

**Colony feeders:** When the submitter says they feed the cats, their contact + colony address fill the case **feeder** fields (shown on Hotspots when geocoded). Staff can edit feeder info on the case.

**Closing as duplicate:** Cases closed with outcome **Duplicate** stay visible for audit but are **excluded from Reports** (and related cat counts) so cats are not counted twice. Keep real work on the keeper case.

**Closed Referred Elsewhere:** Those cases stay in Reports for case volume, but their intake **cats reported** no longer count toward report totals (quick reports and pivot “cats/adults/kittens reported” measures). Partial TNVR closed cases still count reported cats.

---

## 3. Administrator

**Job:** Configure people and the whole pipeline; unblock others.

### After login
Dashboard shows org-wide work; sidebar includes everything (queues, clinics, volunteers, reports, admin).

### Typical loop
1. **Volunteers** — approve applicants, assign interests/teams, set platform role, merge duplicates, reopen inactive. Minimize or **Snooze today** on pending role-change requests when the list is long.
2. **Trap Queue / Hotspots / Equipment** — support field ops; share the public request form from Trap Queue. Use **Assign** / **Reassign** to give a case to a TNVR team member (they see it under **My Cases**).
3. **Clinics / Clinic Events** — partner clinics (days open, packages / optional add-ons for Clinic Events pricing, visit info) and public booking days.
4. **Events** — shared team calendar (shift sign-up rows are hidden while that feature is off).
5. **Admin → Inquiry form custom fields** — About us intro, donate button, and after-submit resource paths (Criteria + Thank-you content).
6. **Team Feed / Reports / Admin** — communicate, measure, brand/settings/teams. Reports skip duplicate-closed cases by default.

### Caseload
Not a personal queue; they supervise and fix access. Work history still appears under **My Impact** / dashboard when they touch cases.

---

## 4. TNVR Team

**Job:** Run field work for assigned teams — trap, transport, recovery, clinic follow-up, gear. Small colonies (≤5 cats/kittens) are tagged **Trap School** on their ZIP team.

### After login
Dashboard shows team cases and personally claimed cases. Sidebar includes Trap Queue, Hotspots, Equipment, Events, and shared tools. (Internal Appointments UI is hidden.)

### Day-to-day
1. **Trap Queue**
   - **All Cases** — open cases ready to claim, oldest first (others’ claims hidden by default; use Filters to show them).
   - **My Cases** — cases you personally claimed (or that an admin assigned to you).
   - Default focus: **My Cases** if you have active claims, otherwise **All Cases**.
   - **Filters** — team scope, show others’ claims, Trap School only, layout/sort.
   - Columns include kitten, adult, and total counts.
   - **Follow-up banner** — if a case you claimed has not been updated in **21+ days**, Trap Queue shows a reminder with **Open case**. A pink dot on Trap Queue in the sidebar means you have at least one idle claimed case. Editing the case clears the reminder.
2. **Claim** before editing (admins may Assign instead).
3. Advance workflow through field statuses; log clinic results on the case when relevant.
4. **Hotspots** for route/colony planning (teammate pins only if they opted in; duplicate-closed colonies are not double-pinned).
5. **Equipment** — check traps in/out (doesn’t auto-return when a case closes).
6. **Events** for the shared calendar; **Team Directory** for teammates who shared contact info.

### Caseload management
- Team scope via **assigned trap team** + personal claims / admin assignments.
- Trap Queue focus toggles + Filters replace older “mine / all / unassigned” view names.

---

## 5. Volunteer

**Job:** Stay oriented via feed, resources, profile, and Events calendar. Same page access for every volunteer interest.

### After login
Core: Dashboard, **Events**, **Team Feed**, **Resources**, **Profile**, **My Impact**; **Team Directory** if adult (birthday set). No Trap Queue or Clinics unless the admin changes their **platform role**.

### Day-to-day
1. **Events** — browse the shared team calendar. (If shift sign-ups are enabled again: open event → position → dated shift → Sign Up.)
2. Check **Team Feed** for updates — react, and edit/delete your own posts when needed.
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
| Adoption | Administrator, or Volunteer with Adoption Specialist interest |

---

## 7. Mental model for training

1. **Platform role** = which pages you can open.
2. **Volunteer interests** = how you are staffed and labeled — not extra page unlocks (except Adoption Specialist).
3. **Cases** auto-assign to a trap team by ZIP (Trap School tag when ≤5 cats+kittens), then move through Trap Queue field work → clinic day results → done.
4. **Trap Queue focus** = All Cases vs My Cases; Filters for scope; claim before edit (except admin). Admins can Assign to a TNVR user.
5. **Idle claims** (21+ days without updates) surface as a Trap Queue follow-up banner + sidebar dot for the claimant.
6. **Events** is the shared calendar path for all volunteers (shift sign-ups optional when enabled).
7. **Contact sharing** is opt-in on My Profile (everything starts hidden).
8. **Reports** omit duplicate-closed cases so cats are not double-counted; Referred Elsewhere closed cases keep case counts but drop intake cats reported. Partial TNVR still counts reported cats.
9. **Dashboard** summarizes; **queues/calendars** are where work happens.
`;
