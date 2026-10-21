/** Seeded handbook: start-to-finish TNVR case work. Downloadable as PDF from Resources. */
export const TNVR_VOLUNTEER_SCRIPT_DOC_VERSION = "2026-10-21b";

export const TNVR_VOLUNTEER_SCRIPT_MARKDOWN = `<!-- tnvr-script-version: ${TNVR_VOLUNTEER_SCRIPT_DOC_VERSION} -->
# TNVR volunteer script — start to finish

This is for people with the **TNVR Team** role. They can open Trap Queue and work cases. A regular **Volunteer** login does not get Trap Queue; those accounts use Events, Team Feed, Resources, and Profile only.

Print or save this from **Resources → Download PDF**.

---

## 1. First login (once)

1. Sign in and land on **Dashboard**.
2. Open **My Profile**.
3. Add contact info and birthday.
4. Under **Directory & map visibility**, turn on only what teammates should see. Phone, email, address, and map pin all start hidden.
5. Skim **Resources** and **Team Feed** so you know where SOPs and announcements live.

You are ready when you can see **Trap Queue**, **Hotspots**, and **Equipment** in the sidebar.

---

## 2. Where cases come from

Someone submits the public request form. The case is auto-assigned to a trap team by colony ZIP. Colonies of **5 or fewer cats + kittens** are tagged **Trap School**.

Your job is not to create the case. Your job is to **claim it, trap it, get clinic results into the case, and close it**.

---

## 3. Start of shift — Trap Queue

Open **Trap Queue**.

- **My Cases** — work already assigned to you (you claimed it, or an admin assigned it). If you have active claims, this is the default.
- **All Cases** — open work ready to pick up. Oldest first. Other people's claims are hidden unless you turn that on in **Filters**.

Use **Filters** when you need your team only, Trap School only, other people's claimed cases, or search by case number, name, or ZIP.

If the sidebar dot on Trap Queue is pink, you have a claimed case with **no update in 21+ days**. Open it, do the work or add a note, or **Unclaim** it so someone else can take it.

---

## 4. Pick a case and claim it

1. In **All Cases**, open a card that matches your team, ZIP, or Trap School capacity.
2. Click **Claim case** (or **Claim to edit**). You must claim before you can edit.
3. The case moves to **My Cases**. You are now the owner until you finish it or unclaim it.

If you cannot take it after all, click **Unclaim**. Do not leave it sitting in your name.

---

## 5. Work the case (before clinic)

On the case page:

1. Read colony location, ZIP, remaining **adults** and **kittens**, feeder/reporter contact, and any notes.
2. Call or text the feeder. Confirm access, trapping window, and remaining cats.
3. Add a **note** after every real contact (attempted or successful). That is what clears the 21-day idle reminder.
4. Update remaining cat counts as the colony changes. Remaining adults + kittens are what reports treat as not fixed.
5. Use **Hotspots** if you need the map for routing. Teammate pins only show if they opted in.
6. If you take traps, log them in **Equipment** (who has the trap). Closing the case does **not** auto-return gear — check it back in when it comes home.

Keep status in the trap workflow as you actually work it (typically **Claimed** while you are in the field). Do not close it yet.

---

## 6. Clinic day — log the cats

After surgery, open the same case and **log a clinic fix** for each cat that was altered:

- clinic name
- fix date
- adult or kitten
- whether they went to foster / a facility

That clinic log is how the case (and Reports) know the cat is **fixed**. If you skip this step, the cat still looks unfixed in the queue.

If a cat went to foster, record the facility on that same clinic log.

Add a short note: how many went, how many remain, next trap night if any.

---

## 7. Repeat until the colony is done

Same case, more trap nights, more clinic logs. Remaining counts should fall as clinic fixes go on.

When no more cats need TNVR from this org:

1. Open **Close case**.
2. Choose an outcome:
   - **TNVR Complete** — colony finished
   - **Partial TNVR** — some done, stopping with cats still out there
   - **Referred Elsewhere** — another group is taking it
   - **Colony Relocated**
   - **Unable to Assist**
   - **Duplicate** — only if this is a copy of another case; keep the real work on the keeper case
3. Write **closure notes**.
4. Save / close.

If you still have that trap, return it in **Equipment**.

---

## 8. Hand-off mid-case

If you are not finishing it:

1. Add a note: what is done, what is left, who to call.
2. **Unclaim**.
3. An admin can **Assign** / **Reassign** it to another TNVR user if needed. They will see it under **My Cases**.

---

## 9. Every week, in this order

1. **Trap Queue → My Cases** — touch every claimed case (note, clinic log, or unclaim).
2. **All Cases** — pick up new work you can actually do.
3. **Equipment** — traps still out.
4. **Team Feed** — announcements.
5. **Events** — shared calendar (shift sign-up rows are currently hidden).

---

## 10. Rules that keep the queue honest

- Claim before you edit.
- Notes after every contact.
- Clinic log the same day as surgery, or the cat still counts as not fixed.
- Do not sit on a claim for 21+ days.
- Duplicate-close only the extra case, not the one you are actually trapping.
- Equipment is manual — return the trap in the app, not just in the field.

**The whole loop:** claim → contact → trap → log clinic fix → update remaining cats → close (or unclaim).
`;
