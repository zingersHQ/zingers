// One-shot Flight teach lines — hazard vs gold clarity for first encounters.
// Latched in localStorage so both bodies (Climb + Circuit) share the same lesson.
import { STORAGE } from "@/lib/brand";

export type FlightTeachKey = "hazard" | "gold" | "gateTrial";

export const FLIGHT_TEACH: Record<FlightTeachKey, string> = {
  hazard: "Dodge the sparks. They shove you. They are not prizes.",
  gold: "Gold rings pay Crowns. Climb for them.",
  gateTrial: "Gate Trial. Clear this exam, then a new sky opens.",
};

type LatchMap = Partial<Record<FlightTeachKey, boolean>>;

function readLatch(): LatchMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE.flightTeach);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LatchMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLatch(next: LatchMap) {
  try {
    localStorage.setItem(STORAGE.flightTeach, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

/** True if this teach has already been shown on this device. */
export function hasFlightTeach(key: FlightTeachKey): boolean {
  return !!readLatch()[key];
}

/**
 * Return the line once, then latch. Subsequent calls return null.
 * Safe to call from effects on sector ready / gold roll.
 */
export function consumeFlightTeach(key: FlightTeachKey): string | null {
  const cur = readLatch();
  if (cur[key]) return null;
  writeLatch({ ...cur, [key]: true });
  return FLIGHT_TEACH[key];
}

/** Crown payout flash — always shown when a gold ring is threaded. */
export function goldPayoutLine(crowns: number): string {
  const n = Math.max(1, Math.round(crowns));
  return `+${n} Crowns`;
}
