import type { SupabaseClient } from "@supabase/supabase-js";
import { releaseIntakeAssignmentFields } from "@/lib/cases/case-assignment";
import type { Profile } from "@/lib/types";

export interface AssignmentItem {
  id: string;
  label: string;
}

export interface AssignmentGroup {
  key: string;
  label: string;
  description: string;
  count: number;
  items: AssignmentItem[];
  reassignable: boolean;
  requiresReassign: boolean;
}

export type AssignmentDecision =
  | { action: "reassign"; targetUserId: string }
  | { action: "dismiss" };

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
    service.from("shifts").select("id, event_name, date").contains("signed_up_emails", [email]),
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
      count: transportAppointments.data!.length,
      items: transportAppointments.data!.map((row) => ({
        id: row.id,
        label: `${row.clinic_name} · ${row.date}`,
      })),
      reassignable: true,
      requiresReassign: false,
    });
  }

  if ((shifts.data ?? []).length > 0) {
    groups.push({
      key: "shift_signups",
      label: "Shift signups",
      description: "Volunteer shift board slots signed up for this volunteer.",
      count: shifts.data!.length,
      items: shifts.data!.map((row) => ({
        id: row.id,
        label: `${row.event_name} · ${row.date}`,
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
          await service
            .from("help_requests")
            .update({
              claimed_by_email: target!.email,
              claimed_by_name: target!.full_name,
            })
            .in("id", ids);
        } else {
          await service
            .from("help_requests")
            .update(releaseIntakeAssignmentFields({}))
            .in("id", ids);
        }
        break;
      }
      case "legacy_case_assignments": {
        const ids = group.items.map((item) => item.id);
        if (decision.action === "reassign") {
          await service
            .from("help_requests")
            .update({ assigned_to: target!.full_name ?? target!.email })
            .in("id", ids);
        } else {
          await service.from("help_requests").update({ assigned_to: null }).in("id", ids);
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
          .select("id, signed_up_emails")
          .in(
            "id",
            group.items.map((item) => item.id)
          );

        for (const shift of shiftRows ?? []) {
          const signedUp = (shift.signed_up_emails ?? []).filter(
            (entry: string) => normalizeEmail(entry) !== email
          );
          if (decision.action === "reassign" && !signedUp.includes(target!.email)) {
            signedUp.push(target!.email);
          }
          await service.from("shifts").update({ signed_up_emails: signedUp }).eq("id", shift.id);
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
            .delete()
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
            .delete()
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

export async function removeVolunteerUser(
  service: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) return error.message;
  return null;
}
