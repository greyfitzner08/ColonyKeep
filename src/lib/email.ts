import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM ?? "TNVR Rescue <noreply@example.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<void> {
  if (!resend) {
    console.log(`[email] Welcome email to ${email} (Resend not configured)`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Welcome to TNVR Rescue!",
    html: `
      <h1>Welcome, ${name}!</h1>
      <p>Your volunteer application has been approved. You now have access to the TNVR Colony Management platform.</p>
      <p><a href="${APP_URL}">Log in to get started</a></p>
      <p>Thank you for volunteering to help community cats!</p>
    `,
  });
}

export async function sendVolunteerApprovalEmail(
  email: string,
  name: string,
  passwordSetupUrl: string
): Promise<void> {
  if (!resend) {
    console.log(`[email] Volunteer approval email to ${email} (Resend not configured)`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Your TNVR Rescue volunteer account is ready",
    html: `
      <h1>Welcome, ${name}!</h1>
      <p>Your volunteer application has been approved.</p>
      <p><strong>Username:</strong> ${email}</p>
      <p><a href="${passwordSetupUrl}">Create your password</a></p>
      <p>After setting your password, you can log in at <a href="${APP_URL}/login">${APP_URL}/login</a>.</p>
      <p>Thank you for volunteering to help community cats!</p>
    `,
  });
}

export async function sendShiftConfirmationEmail(
  email: string,
  name: string,
  shift: { event_name: string; date: string; start_time: string; end_time: string; location: string }
): Promise<void> {
  if (!resend) {
    console.log(`[email] Shift confirmation to ${email} (Resend not configured)`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Shift Confirmed: ${shift.event_name}`,
    html: `
      <h1>Shift Confirmed</h1>
      <p>Hi ${name},</p>
      <p>You've signed up for the following shift:</p>
      <ul>
        <li><strong>Event:</strong> ${shift.event_name}</li>
        <li><strong>Date:</strong> ${shift.date}</li>
        <li><strong>Time:</strong> ${shift.start_time} - ${shift.end_time}</li>
        <li><strong>Location:</strong> ${shift.location}</li>
      </ul>
      <p><a href="${APP_URL}/shift-board">View shift board</a></p>
    `,
  });
}

export async function sendAppointmentConfirmationEmail(
  email: string,
  name: string,
  appointment: {
    clinic_name: string;
    clinic_address: string;
    date: string;
    cat_name?: string | null;
  }
): Promise<void> {
  if (!resend) {
    console.log(`[email] Appointment confirmation to ${email} (Resend not configured)`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Appointment Reserved: ${appointment.clinic_name}`,
    html: `
      <h1>Appointment Reserved</h1>
      <p>Hi ${name},</p>
      <p>An appointment has been reserved for ${appointment.cat_name ?? "a cat"}:</p>
      <ul>
        <li><strong>Clinic:</strong> ${appointment.clinic_name}</li>
        <li><strong>Address:</strong> ${appointment.clinic_address}</li>
        <li><strong>Date:</strong> ${appointment.date}</li>
      </ul>
      <p><a href="${APP_URL}/appointments">View appointments</a></p>
    `,
  });
}

function formatEmailParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export async function sendPublicBookingPendingEmail(
  email: string,
  name: string,
  event: {
    title: string;
    clinic_name: string;
    date: string;
    location: string;
    pending_email_message?: string | null;
  },
  cats: { cat_name?: string | null; total_price: number }[]
): Promise<void> {
  const defaultMessage =
    "We received your clinic booking request. This does not guarantee your spot — our team will review it and email you again when your spot is confirmed.";
  const customMessage = event.pending_email_message?.trim() || defaultMessage;
  const catLines = cats
    .map(
      (cat, index) =>
        `<li>Cat ${index + 1}: ${cat.cat_name ?? "Unnamed"} — $${cat.total_price.toFixed(2)}</li>`
    )
    .join("");

  const html = `
    <h1>Clinic booking request received</h1>
    <p>Hi ${name},</p>
    ${formatEmailParagraphs(customMessage)}
    <p><strong>Event:</strong> ${event.title}<br />
    <strong>Clinic:</strong> ${event.clinic_name}<br />
    <strong>Date:</strong> ${event.date}<br />
    <strong>Location:</strong> ${event.location}</p>
    <ul>${catLines}</ul>
    <p><strong>Your spot is not confirmed yet.</strong> You will receive another email when our team confirms your booking.</p>
  `;

  if (!resend) {
    console.log(`[email] Public booking pending to ${email} (Resend not configured)`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Booking request received — ${event.title}`,
    html,
  });
}

export async function sendPublicBookingConfirmedEmail(
  email: string,
  name: string,
  event: {
    title: string;
    clinic_name: string;
    date: string;
    location: string;
    payment_url?: string | null;
    confirmed_email_message?: string | null;
  },
  cat: { cat_name?: string | null; total_price: number }
): Promise<void> {
  const defaultMessage =
    "Your clinic spot is confirmed! Please arrive on time and follow any check-in instructions we provided.";
  const customMessage = event.confirmed_email_message?.trim() || defaultMessage;
  const paymentBlock = event.payment_url
    ? `<p><a href="${event.payment_url}">Complete payment</a></p>`
    : "";

  const html = `
    <h1>Clinic spot confirmed</h1>
    <p>Hi ${name},</p>
    ${formatEmailParagraphs(customMessage)}
    <p><strong>Event:</strong> ${event.title}<br />
    <strong>Clinic:</strong> ${event.clinic_name}<br />
    <strong>Date:</strong> ${event.date}<br />
    <strong>Location:</strong> ${event.location}<br />
    <strong>Cat:</strong> ${cat.cat_name ?? "Unnamed"} — $${cat.total_price.toFixed(2)}</p>
    ${paymentBlock}
  `;

  if (!resend) {
    console.log(`[email] Public booking confirmed to ${email} (Resend not configured)`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Spot confirmed — ${event.title}`,
    html,
  });
}

export async function sendPublicBookingWaitlistEmail(
  email: string,
  name: string,
  event: { title: string; clinic_name: string; date: string },
  cat: { cat_name?: string | null }
): Promise<void> {
  const html = `
    <h1>Added to backup list</h1>
    <p>Hi ${name},</p>
    <p>Your request for ${event.title} (${event.clinic_name}, ${event.date}) has been placed on our backup list for ${cat.cat_name ?? "your cat"}.</p>
    <p>If a spot opens up, we will contact you by email.</p>
  `;

  if (!resend) {
    console.log(`[email] Public booking waitlist to ${email} (Resend not configured)`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Backup list — ${event.title}`,
    html,
  });
}

export async function sendPublicBookingCancelledEmail(
  email: string,
  name: string,
  event: { title: string; clinic_name: string; date: string },
  cat: { cat_name?: string | null }
): Promise<void> {
  const html = `
    <h1>Booking cancelled</h1>
    <p>Hi ${name},</p>
    <p>Your booking for ${event.title} (${event.clinic_name}, ${event.date})${cat.cat_name ? ` — ${cat.cat_name}` : ""} has been cancelled.</p>
    <p>If you still need clinic services, please submit a new request when spots are available.</p>
  `;

  if (!resend) {
    console.log(`[email] Public booking cancelled to ${email} (Resend not configured)`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Booking cancelled — ${event.title}`,
    html,
  });
}
