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
