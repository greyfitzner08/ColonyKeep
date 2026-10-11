import { redirect } from "next/navigation";

/** Inquiry Queue retired — cases auto-assign to trap teams by ZIP (Trap School is a case tag). */
export default function IntakePage() {
  redirect("/trap-queue");
}
