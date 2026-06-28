import { NextRequest } from "next/server";
import { POST as updateContactPrivacy } from "../contact-privacy/route";

/** @deprecated Use /api/profile/contact-privacy */
export async function POST(request: NextRequest) {
  return updateContactPrivacy(request);
}
