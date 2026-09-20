import { redirect } from "next/navigation";

/** Inquiry Queue retired — cases auto-assign to trap teams / Trap School. */
export default function IntakePage() {
  redirect("/trap-queue");
}
