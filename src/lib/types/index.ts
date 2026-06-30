export type UserRole =
  | "admin"
  | "inquiry_team"
  | "trap_team_lead"
  | "volunteer";

export type HelpRequestStatus =
  | "new_intake"
  | "under_review"
  | "needs_more_info"
  | "routed_to_trap_team"
  | "claimed"
  | "appointment_needed"
  | "appointment_reserved"
  | "cat_trapped"
  | "transported"
  | "checked_in"
  | "completed"
  | "closed";

export type AppointmentStatus =
  | "available"
  | "reserved"
  | "confirmed_transport"
  | "checked_in"
  | "completed"
  | "cancelled";

export type VolunteerApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs_followup";

export type VolunteerRole =
  | "intake_representative"
  | "trapper"
  | "trap_loaner"
  | "transporter"
  | "recovery"
  | "event_volunteer"
  | "grant_writing"
  | "social_media"
  | "snack_patrol"
  | "crafter"
  | "story_writer"
  | "photographer"
  | "videographer"
  | "community_outreach"
  | "clinic_coordination"
  | "youth_volunteer"
  | "other";

export type ShiftType =
  | "trapping"
  | "transport"
  | "clinic"
  | "event"
  | "recovery"
  | "admin"
  | "other";

export type ShiftRequiredRole =
  | "any"
  | "tnvr_volunteer"
  | "intake_representative"
  | "event_volunteer";

export type PublicBookingStatus =
  | "pending"
  | "confirmed"
  | "expired"
  | "cancelled"
  | "waitlist";

export type TrapEquipmentType =
  | "gravity_trap"
  | "drop_trap"
  | "transfer_trap"
  | "microchip_scanner"
  | "trap_divider"
  | "other";

export type TrapEquipmentStatus = "available" | "loaned" | "maintenance" | "retired";

export interface TrapEquipmentItem {
  id: string;
  equipment_type: TrapEquipmentType;
  description: string | null;
  quantity: number;
  status: TrapEquipmentStatus;
  team_id: string | null;
  team_name: string | null;
  location: string | null;
  notes: string | null;
  is_labeled: boolean;
  equipment_label: string | null;
  qr_code_data: string | null;
  assigned_to_profile_id: string | null;
  borrower_name: string | null;
  borrower_email: string | null;
  borrower_phone: string | null;
  logged_by_email: string;
  logged_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface EquipmentVolunteerOption {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  volunteer_roles: VolunteerRole[];
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole | null;
  volunteer_roles: VolunteerRole[];
  team_id: string | null;
  must_change_password: boolean;
  platform_tutorial_completed_at: string | null;
  birthday: string | null;
  home_street: string | null;
  home_city: string | null;
  home_state: string | null;
  home_zip: string | null;
  home_county: string | null;
  home_lat: number | null;
  home_lng: number | null;
  show_on_hotspots_map?: boolean;
  show_phone_in_directory?: boolean;
  show_address_in_directory?: boolean;
  show_phone_on_hotspots_map?: boolean;
  show_address_on_hotspots_map?: boolean;
  tnvr_certificate_uploaded: boolean;
  tnvr_certificate_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface HelpRequest {
  id: string;
  case_number: string;
  status: HelpRequestStatus;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  colony_address: string;
  colony_city: string;
  colony_county: string;
  colony_zip: string;
  colony_lat: number | null;
  colony_lng: number | null;
  kittens_under_8_weeks: number;
  cats_over_8_weeks: number;
  reported_kittens_under_8_weeks: number | null;
  reported_cats_over_8_weeks: number | null;
  can_help: boolean;
  has_traps: boolean;
  can_transport: boolean;
  has_recovery_space: boolean;
  consent_communications: boolean;
  newsletter_list_added_at: string | null;
  assigned_team_id: string | null;
  assigned_team_name: string | null;
  claimed_by_email: string | null;
  claimed_by_name: string | null;
  intake_notes: string | null;
  follow_up_log: FollowUpEntry[];
  follow_up_due_date: string | null;
  medical_flags: MedicalFlag[];
  medical_flag_dismissed: boolean;
  medical_flag_forced: boolean;
  outcome: string | null;
  closure_notes: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_street: string | null;
  contact_city: string | null;
  contact_state: string | null;
  contact_zip: string | null;
  contact_county: string | null;
  colony_state: string | null;
  relationship_to_cats: string | null;
  pregnant_count: number;
  feeding_cats: boolean | null;
  feeder_if_not: string | null;
  feeder_name: string | null;
  feeder_phone: string | null;
  feeder_email: string | null;
  feeder_street: string | null;
  feeder_city: string | null;
  feeder_state: string | null;
  feeder_zip: string | null;
  feeder_county: string | null;
  feeder_lat: number | null;
  feeder_lng: number | null;
  trapping_experience: string | null;
  need_traps: boolean | null;
  willing_to_trap_transport: string | null;
  able_to_trap_transport: string | null;
  how_heard: string | null;
  apartment_name: string | null;
  resolution: string | null;
  closed_at: string | null;
  priority: string | null;
  trapper_trap_loaner: string | null;
  additional_notes: string | null;
  assigned_to: string | null;
  outcome_tnvr_count: number;
  outcome_acc_count: number;
  outcome_foster_count: number;
  outcome_other_count: number;
  cats_remaining: number;
  history_log: HistoryEntry[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowUpEntry {
  id: string;
  timestamp: string;
  author_email: string;
  author_name: string;
  notes: string;
  outcome: string | null;
}

export interface MedicalFlag {
  keyword: string;
  detected_at: string;
  source: "auto" | "manual";
}

export interface HistoryEntry {
  id?: string;
  timestamp: string;
  action: string;
  actor_email: string | null;
  actor_name: string | null;
  details: string | null;
  highlighted?: boolean;
  follow_up?: boolean;
  follow_up_completed?: boolean;
  follow_up_completed_at?: string;
  text_color?: HistoryNoteColor;
}

export type HistoryNoteColor = "default" | "amber" | "blue" | "green" | "red";

export interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  operating_days: string[];
  slots_per_day: number;
  slots_by_day: Record<string, number>;
  included_services: string[];
  packages: ClinicPackage[];
  addon_services: ClinicAddon[];
  service_catalog: ClinicServiceOption[];
  check_in_details: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClinicPackage {
  name: string;
  price: number;
  services: string[];
}

export interface ClinicAddon {
  name: string;
  price: number;
}

export interface ClinicServiceOption {
  name: string;
  price: number;
  included_in_base: boolean;
}

export interface Appointment {
  id: string;
  clinic_id: string;
  clinic_name: string;
  date: string;
  total_slots: number;
  reserved_slots: number;
  help_request_id: string | null;
  cat_id: string | null;
  reserved_by: string | null;
  reserved_by_name: string | null;
  status: AppointmentStatus;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  cat_name: string | null;
  cat_colors: string | null;
  cat_breed: string | null;
  cat_gender: string | null;
  transporter_name: string | null;
  transporter_email: string | null;
  transporter_phone: string | null;
  clinic_result_logged_at: string | null;
  clinic_result_age_category: "adult" | "kitten" | null;
  clinic_result_gender: "male" | "female" | null;
  clinic_result_logged_by: string | null;
  clinic_result_logged_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClinicFix {
  id: string;
  help_request_id: string;
  appointment_id: string | null;
  cat_id: string | null;
  age_category: "adult" | "kitten";
  gender: "male" | "female";
  clinic_name: string | null;
  fix_date: string;
  logged_by: string | null;
  logged_by_name: string | null;
  notes: string | null;
  went_to_foster_facility: boolean;
  foster_facility:
    | "humane_society_charlotte"
    | "animal_care_control"
    | "pet_supermarket"
    | "princetons_meow"
    | "other"
    | null;
  foster_facility_other: string | null;
  created_at: string;
}

export interface Cat {
  id: string;
  help_request_id: string;
  name: string | null;
  gender: string | null;
  female_reproductive_status:
    | "not_pregnant"
    | "pregnant"
    | "in_heat"
    | "lactating"
    | "post_partum"
    | null;
  colors: string | null;
  breed: string | null;
  microchip_id: string | null;
  medical_notes: string | null;
  description: string | null;
  estimated_status: string | null;
  age_category: "adult" | "kitten" | null;
  trapped_status: string | null;
  appointment_status: string | null;
  appointment_id: string | null;
  clinic_id: string | null;
  clinic_name: string | null;
  return_status: string | null;
  went_to_foster_facility: boolean | null;
  foster_facility:
    | "humane_society_charlotte"
    | "animal_care_control"
    | "pet_supermarket"
    | "princetons_meow"
    | "other"
    | null;
  foster_facility_other: string | null;
  foster_program: string | null;
  foster_name: string | null;
  foster_email: string | null;
  foster_phone: string | null;
  trap_date: string | null;
  transport_date: string | null;
  return_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrapTeam {
  id: string;
  name: string;
  region: string;
  zip_codes: string[];
  members: string[];
  lead_email: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VolunteerApplication {
  id: string;
  status: VolunteerApplicationStatus;
  full_name: string;
  email: string;
  phone: string;
  birthday: string;
  home_street: string | null;
  home_city: string | null;
  home_state: string | null;
  home_zip: string | null;
  home_county: string | null;
  roles_requested: VolunteerRole[];
  why_volunteer: string;
  prior_experience: string | null;
  availability: string | null;
  how_heard: string | null;
  liability_waiver_signed: boolean;
  shadow_completed: boolean;
  policy_signed: boolean;
  intake_training: boolean;
  tnvr_certificate_uploaded: boolean;
  tnvr_certificate_url: string | null;
  event_crash_course: boolean;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  event_name: string;
  shift_type: ShiftType;
  required_roles: ShiftRequiredRole;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  team_ids: string[];
  volunteers_needed: number;
  signed_up_emails: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VolunteerHours {
  id: string;
  volunteer_email: string;
  volunteer_name: string;
  team_id: string | null;
  team_name: string | null;
  date: string;
  hours: number;
  hour_type: string;
  help_request_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface TeamAnnouncementComment {
  author_email: string;
  author_name: string;
  text: string;
  created_at: string;
}

export interface TeamAnnouncement {
  id: string;
  message: string;
  team_id: string | null;
  team_name: string | null;
  team_ids: string[];
  audience: "all" | "team" | "roles";
  view_roles: string[];
  author_email: string;
  author_name: string;
  pinned: boolean;
  is_birthday: boolean;
  birthday_person_name: string | null;
  comments: TeamAnnouncementComment[];
  created_at: string;
  updated_at: string;
}

export interface PublicClinicEvent {
  id: string;
  clinic_id: string;
  clinic_name: string;
  title: string;
  date: string;
  location: string;
  total_spots: number;
  description: string | null;
  included_services: string[];
  addon_services: ClinicAddon[];
  service_catalog: ClinicServiceOption[];
  base_price: number;
  payment_url: string | null;
  pending_email_message: string | null;
  confirmed_email_message: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  /** Joined from clinics when loaded for public booking */
  check_in_details?: string | null;
}

export interface LibraryDocument {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  section: string;
  view_roles: UserRole[];
  is_active: boolean;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export type CommunityPartnerOrganizationType =
  | "local_business"
  | "rescue"
  | "grantor"
  | "sponsor"
  | "municipal"
  | "media"
  | "other";

export type CommunityPartnerStatus =
  | "active"
  | "prospect"
  | "past"
  | "do_not_contact";

export interface CommunityPartner {
  id: string;
  name: string;
  organization_type: CommunityPartnerOrganizationType;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  partnership_status: CommunityPartnerStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VolunteerRoleRequest {
  id: string;
  profile_id: string | null;
  application_id: string | null;
  email: string;
  full_name: string | null;
  requested_roles: VolunteerRole[];
  request_type: "add" | "remove";
  status: "pending" | "approved" | "rejected";
  tnvr_certificate_uploaded: boolean;
  tnvr_certificate_url: string | null;
  intake_training: boolean;
  shadow_completed: boolean;
  liability_waiver_signed: boolean;
  policy_signed: boolean;
  event_crash_course: boolean;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicBooking {
  id: string;
  event_id: string;
  status: PublicBookingStatus;
  hold_session_id: string | null;
  expires_at: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  cat_name: string | null;
  cat_colors: string | null;
  cat_breed: string | null;
  cat_gender: string | null;
  has_injuries: boolean;
  injury_details: string | null;
  selected_addons: string[];
  addon_payments?: Record<string, boolean>;
  total_price: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleDescription {
  id: string;
  role_id: VolunteerRole;
  label: string;
  description: string;
  /** Training/requirement fields required before this volunteer role can be approved. */
  requirements: string[];
  created_at: string;
  updated_at: string;
}
