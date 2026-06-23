import type { PublicBooking } from "@/lib/types";

/** Count spots that are taken (confirmed, or pending and not expired). */
export function countOccupiedSpots(bookings: PublicBooking[]): number {
  const now = Date.now();
  return bookings.filter((booking) => {
    if (booking.status === "confirmed") return true;
    if (booking.status === "pending") {
      if (!booking.expires_at) return true;
      return new Date(booking.expires_at).getTime() > now;
    }
    return false;
  }).length;
}

export function availableSpots(totalSpots: number, bookings: PublicBooking[]): number {
  return Math.max(0, totalSpots - countOccupiedSpots(bookings));
}
