// Guest Climb depth held until claim (docs/two-doors.md §3.3 / flight-first-plan).
// While guest, runs mark nothing on the board; the best depth converts once on adopt.
import { STORAGE } from "@/lib/brand";
import { ascentDepthXp } from "@/lib/ascent-rules";

export function noteGuestClimbDepth(sectors: number): void {
  if (typeof window === "undefined") return;
  const n = Math.max(0, Math.floor(sectors));
  if (n <= 0) return;
  try {
    const prev = Number(localStorage.getItem(STORAGE.guestClimbBest) || "0");
    if (n > prev) localStorage.setItem(STORAGE.guestClimbBest, String(n));
  } catch {
    /* ignore */
  }
}

export function peekGuestClimbDepth(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Math.max(0, Math.floor(Number(localStorage.getItem(STORAGE.guestClimbBest) || "0")));
  } catch {
    return 0;
  }
}

/** One-shot: read + clear guest depth. Returns sectors cleared (0 if none). */
export function takeGuestClimbDepth(): number {
  const n = peekGuestClimbDepth();
  if (typeof window === "undefined") return n;
  try {
    localStorage.removeItem(STORAGE.guestClimbBest);
  } catch {
    /* ignore */
  }
  return n;
}

/** Trainer XP from a converted guest ascent (same soul math as a deeper Climb). */
export function guestDepthXp(sectors: number): number {
  return ascentDepthXp(sectors, false);
}
