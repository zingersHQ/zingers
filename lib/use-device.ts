"use client";
// Unified device detection — one source of truth for "is this a phone?" and
// "does this have a touch pointer?". Before this, `isMobile` (max-width: 640px)
// and `isTouch` (coarse pointer) were recomputed independently in
// grounds-screen.tsx, world.tsx, and first-run.tsx. Mobile routing + the mobile
// shell (docs/mobile.md) key off these, so they must agree everywhere.
//
// SSR-safe: both return `false` on the server and on the first client render,
// then settle in an effect — so they never cause a hydration mismatch.
import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 640px)";
const COARSE_QUERY = "(pointer: coarse)";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return matches;
}

/** True on phone-width viewports (<= 640px). Drives which shell/body we serve. */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}

/** True when the primary pointer is coarse or the device reports touch points. */
export function useIsTouch(): boolean {
  const coarse = useMediaQuery(COARSE_QUERY);
  const [hasTouch, setHasTouch] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setHasTouch("ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0);
  }, []);
  return coarse || hasTouch;
}
