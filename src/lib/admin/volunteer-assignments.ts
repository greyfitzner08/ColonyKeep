import type { SupabaseClient } from "@supabase/supabase-js";
import { releaseIntakeAssignmentFields } from "@/lib/cases/case-assignment";
import { normalizeHistoryLog } from "@/lib/cases/history-log";
import type { Profile } from "@/lib/types";

export interface AssignmentItem {
  id: string;
  label: string;
}

export interface AssignmentGroup {
  key: string;
  label: string;
  description: string;
  unassignOutcome: string;
  count: number;
  items: AssignmentItem[];
  reassignable: boolean;
  requiresReassign: boolean;
}

export type AssignmentDecision =
  | { action: "reassign"; targetUserId: string }
  | { action: "unassign" };

export interface VolunteerAssignmentPreview {
  userId: string;
  email: string;
  fullName: string | null;
  groups: AssignmentGroup[];
  hasAssignments: boolean;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function loadTargetProfile(
  service: SupabaseClient,
  targetUserId: string
): Promise<Profile | null> {
  const { data } = await service.from("profiles").select("*").eq("id", targetUserId).maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function previewVolunteerAssignments(
  service: SupabaseClient,
  profile: Pick<Profile, "id" | "email" | "full_name">
): Promise<VolunteerAssignmentPreview> {
  const email = normalizeEmail(profile.email);
  const fullName = profile.full_name?.trim() ?? "";

  const [
    claimedCases,
    legacyCasesByEmail,
    legacyCasesByName,
    reservedAppointments,
    transportAppointments,
    shifts,
    teamsAsLead,
    teamsAsMember,
    equipmentAssigned,
    equipmentBorrowed,
    volunteerHours,
    application,
    roleRequests,
    announcements,
    libraryDocs,
  ] = await Promise.all([
    service
      .from("help_requests")
      .select("id, case_number")
      .ilike("claimed_by_email", email),
    service
      .from("help_requests")
      .select("id, case_number, assigned_to")
      .ilike("assigned_to", email),
    fullName
      ? service
          .from("help_requests")
          .select("id, case_number, assigned_to")
          .ilike("assigned_to", fullName)
      : Promise.resolve({ data: [] as { id: string; case_number: string; assigned_to: string | null }[] }),
    service
      .from("appointments")
      .select("id, clinic_name, date, status")
      .ilike("reserved_by", email)
      .neq("status", "available"),
    service
      .from("appointments")
      .select("id, clinic_name, date")
      .ilike("transporter_email", email),
    service.from("shifts").select("id, event_name, position_name, date, signed_up_emails, waitlist_emails"),
    service.from("trap_teams").select("id, name").ilike("lead_email", email),
    service.from("trap_teams").select("id, name").contains("members", [email]),
    service
      .from("trap_equipment_items")
      .select("id, equipment_type, equipment_label")
      .eq("assigned_to_profile_id", profile.id),
    service
      .from("trap_equipment_items")
      .select("id, equipment_type, equipment_label")
      .ilike("borrower_email", email),
    service.from("volunteer_hours").select("id, date, hour_type").ilike("volunteer_email", email),
    service.from("volunteer_applications").select("id, status").ilike("email", email).maybeSingle(),
    service
      .from("volunteer_role_requests")
      .select("id, status")
      .or(`email.ilike.${email},profile_id.eq.${profile.id}`),
    service.from("team_announcements").select("id, message").ilike("author_email", email),
    service.from("library_documents").select("id, title").ilike("created_by_email", email),
  ]);

  const legacyCaseMap = new Map<string, { id: string; case_number: string }>();
  for (const row of legacyCasesByEmail.data ?? []) {
    legacyCaseMap.set(row.id, row);
  }
  for (const row of legacyCasesByName.data ?? []) {
    legacyCaseMap.set(row.id, row);
  }
  const legacyCases = Array.from(legacyCaseMap.values());

  const groups: AssignmentGroup[] = [];

  if ((claimedCases.data ?? []).length > 0) {
    groups.push({
      key: "claimed_cases",
      label: "Claimed cases",
      description: "Intake or trap cases currently claimed by this volunteer.",
      unassignOutcome:
        "Releases their claim only. Inquiry cases stay in the inquiry queue; trap cases stay with their assigned team. Workflow status and case history are kept.",
      count: claimedCases.data!.length,
      items: claimedCases.data!.map((row) => ({
        id: row.id,
        label: row.case_number,
      })),
      reassignable: true,
      requiresReassign: false,
    });
  }

  if (legacyCases.length > 0) {
    groups.push({
      key: "legacy_case_assignments",
      label: "Legacy case assignments",
      description: "Older assigned-to fields that still reference this volunteer.",
      unassignOutcome:
        "Clears their name from the case. The cases are not closed or deleted.",
      count: legacyCases.length,
      items: legacyCases.map((row) => ({
        id: row.id,
        label: row.case_number,
      })),
      reassignable: true,
      requiresReassign: false,
    });
  }

  if ((reservedAppointments.data ?? []).length > 0) {
    groups.push({
      key: "reserved_appointments",
      label: "Clinic appointments",
      description: "Reserved clinic slots claimed by this volunteer.",
      unassignOutcome:
        "Cancels their reservation and opens the clinic slot again. The clinic date itself stays on the calendar.",
      count: reservedAppointments.data!.length,
      items: reservedAppointments.data!.map((row) => ({
        id: row.id,
        label: `${row.clinic_name} · ${row.date}`,
      })),
      reassignable: true,
      requiresReassign: false,
    });
  }

  if ((transportAppointments.data ?? []).length > 0) {
    groups.push({
      key: "transport_appointments",
      label: "Transport assignments",
      description: "Appointments where this volunteer is listed as transporter.",
      unassignOutcome:
        "Removes them as transporter. The appointment and clinic date are unchanged.",
      count: transportAppointments.data!.length,
      items: transportAppointments.data!.map((row) => ({
        id: row.id,
        label: `${row.clinic_name} · ${row.date}`,
      })),
      reassignable: true,
      requiresReassign: false,
    });
  }

  const shiftRows = (shifts.data ?? []).filter((row) => {
    const signedUp = row.signed_up_emails ?? [];
    const waitlist = row.waitlist_emails ?? [];
    return (
      signedUp.some((entry: string) => normalizeEmail(entry) === email) ||
      waitlist.some((entry: string) => normalizeEmail(entry) === email)
    );
  });

  if (shiftRows.length > 0) {
    groups.push({
      key: "shift_signups",
      label: "Shift board",
      description: "Shift signups and waitlist spots for this volunteer.",
      unassignOutcome:
        "Removes them from the signup and waitlist. The shift stays on the board for other volunteers.",
      count: shiftRows.length,
      items: shiftRows.map((row) => ({
        id: row.id,
        label: row.position_name
          ? `${row.event_name} · ${row.position_name} · ${row.date}`
          : `${row.event_name} · ${row.date}`,
      })),
      reassignable: true,
      requiresReassign: false,
    });
  }

  if ((teamsAsLead.data ?? []).length > 0) {
    groups.push({
      key: "trap_team_lead",
      label: "Trap team lead",
      description: "Trap teams where this volunteer is the listed lead.",
      unassignOutcome: "Another volunteer must be chosen as the new team lead.",
      count: teamsAsLead.data!.length,
      items: teamsAsLead.data!.map((row) => ({
        id: row.id,
        label: row.name,
      })),
      reassignable: true,
      requiresReassign: true,
    });
  }

  if ((teamsAsMember.data ?? []).length > 0) {
    groups.push({
      key: "trap_team_membership",
      label: "Trap team membership",
      description: "Trap team rosters that include this volunteer.",
      unassignOutcome: "Removes them from the team roster. The trap team stays active.",
      count: teamsAsMember.data!.length,
      items: teamsAsMember.data!.map((row) => ({
        id: row.id,
        label: row.name,
      })),
      reassignable: false,
      requiresReassign: false,
    });
  }

  if ((equipmentAssigned.data ?? []).length > 0) {
    groups.push({
      key: "equipment_custody",
      label: "Assigned trap equipment",
      description: "Equipment items assigned to this volunteer for custody.",
      unassignOutcome: "Marks the equipment as unassigned. The equipment record is not deleted.",
      count: equipmentAssigned.data!.length,
      items: equipmentAssigned.data!.map((row) => ({
        id: row.id,
        label: row.equipment_label?.trim() || row.equipment_type,
      })),
      reassignable: true,
      requiresReassign: false,
    });
  }

  if ((equipmentBorrowed.data ?? []).length > 0) {
    groups.push({
      key: "equipment_loans",
      label: "Loaned trap equipment",
      description: "Equipment currently loaned out with this volunteer as borrower.",
      unassignOutcome: "Clears the borrower on the loan. The equipment item is not deleted.",
      count: equipmentBorrowed.data!.length,
      items: equipmentBorrowed.data!.map((row) => ({
        id: row.id,
        label: row.equipment_label?.trim() || row.equipment_type,
      })),
      reassignable: true,
      requiresReassign: false,
    });
  }

  if ((volunteerHours.data ?? []).length > 0) {
    groups.push({
      key: "volunteer_hours",
      label: "Logged volunteer hours",
      description: "Impact hours logged under this volunteer's email.",
      unassignOutcome: "Deletes these logged hour entries.",
      count: volunteerHours.data!.length,
      items: volunteerHours.data!.map((row) => ({
        id: row.id,
        label: `${row.date} · ${row.hour_type}`,
      })),
      reassignable: true,
      requiresReassign: false,
    });
  }

  const volunteerRecordCount =
    (application.data ? 1 : 0) + (roleRequests.data ?? []).length;

  if (volunteerRecordCount > 0) {
    groups.push({
      key: "volunteer_records",
      label: "Volunteer application records",
      description: "Signup application and role request history for this volunteer.",
      unassignOutcome: "Deletes their application and role request history.",
      count: volunteerRecordCount,
      items: [
        ...(application.data
          ? [{ id: application.data.id, label: `Application (${application.data.status})` }]
          : []),
        ...(roleRequests.data ?? []).map((row) => ({
          id: row.id,
          label: `Role request (${row.status})`,
        })),
      ],
      reassignable: false,
      requiresReassign: false,
    });
  }

  if ((announcements.data ?? []).length > 0) {
    groups.push({
      key: "team_announcements",
      label: "Team feed posts",
      description: "Announcements authored by this volunteer.",
      unassignOutcome: "Keeps the posts but removes this volunteer as author.",
      count: announcements.data!.length,
      items: announcements.data!.map((row) => ({
        id: row.id,
        label: row.message.slice(0, 60),
      })),
      reassignable: true,
      requiresReassign: false,
    });
  }

  if ((libraryDocs.data ?? []).length > 0) {
    groups.push({
      key: "library_documents",
      label: "Resource library uploads",
      description: "Documents uploaded by this volunteer.",
      unassignOutcome: "Keeps the documents but clears this volunteer as uploader.",
      count: libraryDocs.data!.length,
      items: libraryDocs.data!.map((row) => ({
        id: row.id,
        label: row.title,
      })),
      reassignable: true,
      requiresReassign: false,
    });
  }

  return {
    userId: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    groups,
    hasAssignments: groups.length > 0,
  };
}

function assertNoError(
  error: { message: string } | null,
  fallback: string
): string | null {
  return error ? error.message || fallback : null;
}

/** Release claims without wiping queue placement or history. */
async function releaseClaimedCases(
  service: SupabaseClient,
  ids: string[],
  options?: { reason?: string }
): Promise<string | null> {
  if (ids.length === 0) return null;

  const { data: rows, error: fetchError } = await service
    .from("help_requests")
    .select("id, status, history_log, assigned_team_id, assigned_team_name")
    .in("id", ids);

  const fetchProblem = assertNoError(fetchError, "Unable to load claimed cases");
  if (fetchProblem) return fetchProblem;

  const reason =
    options?.reason ??
    "Claim released because the volunteer was removed from the platform";

  for (const row of rows ?? []) {
    const updates: Record<string, unknown> = {
      ...releaseIntakeAssignmentFields({}),
    };

    // Keep inquiry statuses in the inquiry bucket (under_review / needs_more_info / etc.).
    // Only the trap-stage label "claimed" needs to unwind so the case returns to the
    // assigned team's unclaimed board — team assignment itself is preserved.
    if (row.status === "claimed") {
      updates.status = "routed_to_trap_team";
    }

    const history = normalizeHistoryLog(row.history_log);
    history.push({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action: "unclaim",
      actor_email: null,
      actor_name: "System",
      details: reason,
      highlighted: false,
      follow_up: false,
      follow_up_completed: false,
      text_color: "default",
    });
    updates.history_log = history;

    const { error } = await service.from("help_requests").update(updates).eq("id", row.id);
    const updateProblem = assertNoError(error, "Unable to release case claim");
    if (updateProblem) return updateProblem;
  }

  return null;
}

async function releaseReservedAppointment(service: SupabaseClient, appointmentId: string) {
  const { data: appointment } = await service
    .from("appointments")
    .select("id, status, help_request_id, cat_id, clinic_result_logged_at")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!appointment || appointment.status === "available") return;

  if (appointment.clinic_result_logged_at) {
    await service
      .from("appointments")
      .update({
        reserved_by: null,
        reserved_by_name: null,
        transporter_email: null,
        transporter_name: null,
      })
      .eq("id", appointmentId);
    return;
  }

  await service
    .from("appointments")
    .update({
      status: "available",
      help_request_id: null,
      cat_id: null,
      reserved_by: null,
      reserved_by_name: null,
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      cat_name: null,
      cat_colors: null,
      cat_breed: null,
      cat_gender: null,
      reserved_slots: 0,
    })
    .eq("id", appointmentId);

  if (appointment.cat_id) {
    await service
      .from("cats")
      .update({
        appointment_id: null,
        appointment_status: null,
      })
      .eq("id", appointment.cat_id);
  }

  if (appointment.help_request_id) {
    const { count } = await service
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("help_request_id", appointment.help_request_id)
      .neq("status", "available");

    if ((count ?? 0) === 0) {
      await service
        .from("help_requests")
        .update({ status: "routed_to_trap_team" })
        .eq("id", appointment.help_request_id)
        .eq("status", "appointment_reserved");
    }
  }
}

export function validateAssignmentDecisions(
  preview: VolunteerAssignmentPreview,
  decisions: Record<string, AssignmentDecision>
): string | null {
  for (const group of preview.groups) {
    const decision = decisions[group.key];
    if (!decision) {
      return `Choose what to do with ${group.label.toLowerCase()}.`;
    }
    if (group.requiresReassign && decision.action !== "reassign") {
      return `${group.label} must be reassigned to another user.`;
    }
    if (decision.action === "reassign" && !decision.targetUserId) {
      return `Select a user to reassign ${group.label.toLowerCase()} to.`;
    }
    if (!group.reassignable && decision.action === "reassign") {
      return `${group.label} cannot be reassigned.`;
    }
  }
  return null;
}

export async function applyVolunteerAssignmentDecisions(
  service: SupabaseClient,
  preview: VolunteerAssignmentPreview,
  decisions: Record<string, AssignmentDecision>
): Promise<string | null> {
  const email = normalizeEmail(preview.email);
  const validationError = validateAssignmentDecisions(preview, decisions);
  if (validationError) return validationError;

  for (const group of preview.groups) {
    const decision = decisions[group.key]!;
    const target =
      decision.action === "reassign"
        ? await loadTargetProfile(service, decision.targetUserId)
        : null;

    if (decision.action === "reassign" && !target) {
      return "Selected reassignment user was not found.";
    }

    switch (group.key) {
      case "claimed_cases": {
        const ids = group.items.map((item) => item.id);
        if (decision.action === "reassign") {
          const { error } = await service
            .from("help_requests")
            .update({
              claimed_by_email: target!.email,
              claimed_by_name: target!.full_name,
            })
            .in("id", ids);
          const problem = assertNoError(error, "Unable to reassign claimed cases");
          if (problem) return problem;
        } else {
          const problem = await releaseClaimedCases(service, ids, {
            reason: "Claim released because the volunteer was removed from the platform",
          });
          if (problem) return problem;
        }
        break;
      }
      case "legacy_case_assignments": {
        const ids = group.items.map((item) => item.id);
        if (decision.action === "reassign") {
          const { error } = await service
            .from("help_requests")
            .update({ assigned_to: target!.full_name ?? target!.email })
            .in("id", ids);
          const problem = assertNoError(error, "Unable to reassign legacy case assignments");
          if (problem) return problem;
        } else {
          const { error } = await service
            .from("help_requests")
            .update({ assigned_to: null })
            .in("id", ids);
          const problem = assertNoError(error, "Unable to clear legacy case assignments");
          if (problem) return problem;
        }
        break;
      }
      case "reserved_appointments": {
        if (decision.action === "reassign") {
          await service
            .from("appointments")
            .update({
              reserved_by: target!.email,
              reserved_by_name: target!.full_name,
            })
            .in(
              "id",
              group.items.map((item) => item.id)
            );
        } else {
          for (const item of group.items) {
            await releaseReservedAppointment(service, item.id);
          }
        }
        break;
      }
      case "transport_appointments": {
        if (decision.action === "reassign") {
          await service
            .from("appointments")
            .update({
              transporter_email: target!.email,
              transporter_name: target!.full_name,
            })
            .in(
              "id",
              group.items.map((item) => item.id)
            );
        } else {
          await service
            .from("appointments")
            .update({
              transporter_email: null,
              transporter_name: null,
            })
            .in(
              "id",
              group.items.map((item) => item.id)
            );
        }
        break;
      }
      case "shift_signups": {
        const { data: shiftRows } = await service
          .from("shifts")
          .select("id, signed_up_emails, waitlist_emails")
          .in(
            "id",
            group.items.map((item) => item.id)
          );

        for (const shift of shiftRows ?? []) {
          const signedUp = (shift.signed_up_emails ?? []).filter(
            (entry: string) => normalizeEmail(entry) !== email
          );
          const waitlist = (shift.waitlist_emails ?? []).filter(
            (entry: string) => normalizeEmail(entry) !== email
          );
          if (decision.action === "reassign" && !signedUp.some((entry: string) => normalizeEmail(entry) === normalizeEmail(target!.email))) {
            signedUp.push(target!.email);
          }
          await service
            .from("shifts")
            .update({ signed_up_emails: signedUp, waitlist_emails: waitlist })
            .eq("id", shift.id);
        }
        break;
      }
      case "trap_team_lead": {
        await service
          .from("trap_teams")
          .update({ lead_email: target!.email })
          .in(
            "id",
            group.items.map((item) => item.id)
          );
        break;
      }
      case "trap_team_membership": {
        const { data: teams } = await service
          .from("trap_teams")
          .select("id, members")
          .in(
            "id",
            group.items.map((item) => item.id)
          );
        for (const team of teams ?? []) {
          const members = (team.members ?? []).filter(
            (member: string) => normalizeEmail(member) !== email
          );
          await service.from("trap_teams").update({ members }).eq("id", team.id);
        }
        break;
      }
      case "equipment_custody": {
        await service
          .from("trap_equipment_items")
          .update({
            assigned_to_profile_id:
              decision.action === "reassign" ? target!.id : null,
          })
          .in(
            "id",
            group.items.map((item) => item.id)
          );
        break;
      }
      case "equipment_loans": {
        await service
          .from("trap_equipment_items")
          .update({
            borrower_email: decision.action === "reassign" ? target!.email : null,
            borrower_name: decision.action === "reassign" ? target!.full_name : null,
          })
          .in(
            "id",
            group.items.map((item) => item.id)
          );
        break;
      }
      case "volunteer_hours": {
        if (decision.action === "reassign") {
          await service
            .from("volunteer_hours")
            .update({
              volunteer_email: target!.email,
              volunteer_name: target!.full_name ?? target!.email,
            })
            .in(
              "id",
              group.items.map((item) => item.id)
            );
        } else {
          await service
            .from("volunteer_hours")
            .delete()
            .in(
              "id",
              group.items.map((item) => item.id)
            );
        }
        break;
      }
      case "volunteer_records": {
        await service.from("volunteer_applications").delete().ilike("email", email);
        await service
          .from("volunteer_role_requests")
          .delete()
          .or(`email.ilike.${email},profile_id.eq.${preview.userId}`);
        break;
      }
      case "team_announcements": {
        if (decision.action === "reassign") {
          await service
            .from("team_announcements")
            .update({
              author_email: target!.email,
              author_name: target!.full_name,
            })
            .in(
              "id",
              group.items.map((item) => item.id)
            );
        } else {
          await service
            .from("team_announcements")
            .update({
              author_email: "removed-volunteer@local",
              author_name: "Former volunteer",
            })
            .in(
              "id",
              group.items.map((item) => item.id)
            );
        }
        break;
      }
      case "library_documents": {
        if (decision.action === "reassign") {
          await service
            .from("library_documents")
            .update({ created_by_email: target!.email })
            .in(
              "id",
              group.items.map((item) => item.id)
            );
        } else {
          await service
            .from("library_documents")
            .update({ created_by_email: null })
            .in(
              "id",
              group.items.map((item) => item.id)
            );
        }
        break;
      }
      default:
        break;
    }
  }

  const { data: memberTeams } = await service
    .from("trap_teams")
    .select("id, members")
    .contains("members", [email]);

  for (const team of memberTeams ?? []) {
    const members = (team.members ?? []).filter(
      (member: string) => normalizeEmail(member) !== email
    );
    await service.from("trap_teams").update({ members }).eq("id", team.id);
  }

  await service.from("profiles").update({ team_id: null }).eq("id", preview.userId);

  return null;
}

/** Default every assignment group to unassign (or empty reassign when required). */
export function defaultAssignmentDecisions(
  preview: VolunteerAssignmentPreview
): Record<string, AssignmentDecision> {
  const decisions: Record<string, AssignmentDecision> = {};
  for (const group of preview.groups) {
    if (group.requiresReassign) {
      decisions[group.key] = { action: "reassign", targetUserId: "" };
    } else {
      decisions[group.key] = { action: "unassign" };
    }
  }
  return decisions;
}

async function loadVolunteerEmails(
  service: SupabaseClient,
  profile: Pick<Profile, "id" | "email">
): Promise<string[]> {
  const emails = new Set<string>([normalizeEmail(profile.email)]);
  const { data: aliases } = await service
    .from("profile_email_aliases")
    .select("email")
    .eq("profile_id", profile.id);
  for (const alias of aliases ?? []) {
    if (alias.email?.trim()) emails.add(normalizeEmail(alias.email));
  }
  return Array.from(emails);
}

function emailMatches(candidate: string | null | undefined, emails: Set<string>): boolean {
  if (!candidate?.trim()) return false;
  return emails.has(normalizeEmail(candidate));
}

/**
 * Final cleanup so a removed volunteer no longer appears in live app locations.
 * Safe to run after assignment decisions (or alone when there were no decisions).
 * Does not clear trap team lead — that must be reassigned first.
 */
export async function scrubVolunteerFromApp(
  service: SupabaseClient,
  profile: Pick<Profile, "id" | "email" | "full_name">
): Promise<string | null> {
  const emailList = await loadVolunteerEmails(service, profile);
  const emails = new Set(emailList);
  const fullName = profile.full_name?.trim() ?? "";

  const { data: leadTeams } = await service.from("trap_teams").select("id, name, lead_email");
  const stillLeading = (leadTeams ?? []).filter((team) => emailMatches(team.lead_email, emails));
  if (stillLeading.length > 0) {
    return `Reassign trap team lead before removing this volunteer (${stillLeading
      .map((team) => team.name)
      .join(", ")}).`;
  }

  for (const email of emailList) {
    const { data: claimed } = await service
      .from("help_requests")
      .select("id")
      .ilike("claimed_by_email", email);
    const claimProblem = await releaseClaimedCases(
      service,
      (claimed ?? []).map((row) => row.id),
      { reason: "Claim released because the volunteer was removed from the platform" }
    );
    if (claimProblem) return claimProblem;

    // Clear leftover claim-name / assigned-to references without changing case status.
    const { error: claimNameError } = await service
      .from("help_requests")
      .update({ claimed_by_name: null })
      .ilike("claimed_by_name", email);
    const claimNameProblem = assertNoError(
      claimNameError,
      "Unable to clear leftover case claim names"
    );
    if (claimNameProblem) return claimNameProblem;

    const { error: legacyEmailError } = await service
      .from("help_requests")
      .update({ assigned_to: null })
      .ilike("assigned_to", email);
    const legacyEmailProblem = assertNoError(
      legacyEmailError,
      "Unable to clear legacy case assignments"
    );
    if (legacyEmailProblem) return legacyEmailProblem;

    const { data: reserved } = await service
      .from("appointments")
      .select("id")
      .ilike("reserved_by", email)
      .neq("status", "available");
    for (const row of reserved ?? []) {
      await releaseReservedAppointment(service, row.id);
    }

    const { error: transportError } = await service
      .from("appointments")
      .update({ transporter_email: null, transporter_name: null })
      .ilike("transporter_email", email);
    const transportProblem = assertNoError(transportError, "Unable to clear transport assignments");
    if (transportProblem) return transportProblem;

    const { error: hoursError } = await service
      .from("volunteer_hours")
      .delete()
      .ilike("volunteer_email", email);
    const hoursProblem = assertNoError(hoursError, "Unable to delete volunteer hours");
    if (hoursProblem) return hoursProblem;

    const { error: appError } = await service
      .from("volunteer_applications")
      .delete()
      .ilike("email", email);
    const appProblem = assertNoError(appError, "Unable to delete volunteer applications");
    if (appProblem) return appProblem;

    const { error: roleReqError } = await service
      .from("volunteer_role_requests")
      .delete()
      .or(`email.ilike.${email},profile_id.eq.${profile.id}`);
    const roleReqProblem = assertNoError(roleReqError, "Unable to delete role requests");
    if (roleReqProblem) return roleReqProblem;

    const { error: fosterError } = await service
      .from("cats")
      .update({ foster_email: null })
      .ilike("foster_email", email);
    const fosterProblem = assertNoError(fosterError, "Unable to clear foster contacts");
    if (fosterProblem) return fosterProblem;

    const { error: borrowerError } = await service
      .from("trap_equipment_items")
      .update({ borrower_email: null, borrower_name: null, borrower_phone: null })
      .ilike("borrower_email", email);
    const borrowerProblem = assertNoError(borrowerError, "Unable to clear equipment loans");
    if (borrowerProblem) return borrowerProblem;
  }

  if (fullName) {
    const { error: claimFullNameError } = await service
      .from("help_requests")
      .update({ claimed_by_name: null })
      .ilike("claimed_by_name", fullName);
    const claimFullNameProblem = assertNoError(
      claimFullNameError,
      "Unable to clear leftover case claim names"
    );
    if (claimFullNameProblem) return claimFullNameProblem;

    const { error: legacyNameError } = await service
      .from("help_requests")
      .update({ assigned_to: null })
      .ilike("assigned_to", fullName);
    const legacyNameProblem = assertNoError(
      legacyNameError,
      "Unable to clear legacy case name assignments"
    );
    if (legacyNameProblem) return legacyNameProblem;
  }

  const { error: equipmentError } = await service
    .from("trap_equipment_items")
    .update({ assigned_to_profile_id: null })
    .eq("assigned_to_profile_id", profile.id);
  const equipmentProblem = assertNoError(equipmentError, "Unable to clear equipment custody");
  if (equipmentProblem) return equipmentProblem;

  const { data: shifts } = await service
    .from("shifts")
    .select("id, signed_up_emails, waitlist_emails");
  for (const shift of shifts ?? []) {
    const signedUp = (shift.signed_up_emails ?? []).filter(
      (entry: string) => !emailMatches(entry, emails)
    );
    const waitlist = (shift.waitlist_emails ?? []).filter(
      (entry: string) => !emailMatches(entry, emails)
    );
    if (
      signedUp.length !== (shift.signed_up_emails ?? []).length ||
      waitlist.length !== (shift.waitlist_emails ?? []).length
    ) {
      const { error } = await service
        .from("shifts")
        .update({ signed_up_emails: signedUp, waitlist_emails: waitlist })
        .eq("id", shift.id);
      const problem = assertNoError(error, "Unable to clear shift board signups");
      if (problem) return problem;
    }
  }

  const { data: teams } = await service.from("trap_teams").select("id, members");
  for (const team of teams ?? []) {
    const members = (team.members ?? []).filter(
      (member: string) => !emailMatches(member, emails)
    );
    if (members.length !== (team.members ?? []).length) {
      const { error } = await service.from("trap_teams").update({ members }).eq("id", team.id);
      const problem = assertNoError(error, "Unable to clear trap team membership");
      if (problem) return problem;
    }
  }

  const { data: announcements } = await service
    .from("team_announcements")
    .select("id, author_email, comments");
  for (const post of announcements ?? []) {
    const comments = Array.isArray(post.comments) ? post.comments : [];
    const nextComments = comments.filter(
      (comment: { author_email?: string | null }) => !emailMatches(comment.author_email, emails)
    );
    const authorMatch = emailMatches(post.author_email, emails);
    if (!authorMatch && nextComments.length === comments.length) continue;

    const { error } = await service
      .from("team_announcements")
      .update({
        ...(authorMatch
          ? { author_email: "removed-volunteer@local", author_name: "Former volunteer" }
          : {}),
        comments: nextComments,
      })
      .eq("id", post.id);
    const problem = assertNoError(error, "Unable to clear team feed authorship");
    if (problem) return problem;
  }

  for (const email of emailList) {
    const { error } = await service
      .from("library_documents")
      .update({ created_by_email: null })
      .ilike("created_by_email", email);
    const problem = assertNoError(error, "Unable to clear library uploader");
    if (problem) return problem;
  }

  await service.from("profiles").update({ team_id: null }).eq("id", profile.id);
  await service.from("profile_email_aliases").delete().eq("profile_id", profile.id);

  return null;
}

export async function removeVolunteerUser(
  service: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) return error.message;
  return null;
}
