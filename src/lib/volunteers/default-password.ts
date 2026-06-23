/** Server-only default password for newly approved volunteer accounts. */
export function getDefaultVolunteerPassword(): string {
  return process.env.DEFAULT_VOLUNTEER_PASSWORD ?? "FeralFelines123!";
}
