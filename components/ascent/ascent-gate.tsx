"use client";
// /ascent — one shareable door for the Ascent.
// Default: phone → Climb (thumb body), desktop → Circuit (flight body).
// Override for QA / parity: ?body=flight | ?body=thumb
// Same challenge query (?climb=&gp=); body pick is independent of share door tags.
import { useEffect, useState } from "react";
import { useIsMobile, useIsTouch } from "@/lib/use-device";
import { MobileShell } from "@/components/mobile/mobile-shell";
import GroundsScreen from "@/components/grounds/grounds-screen";

export type AscentBodyId = "flight" | "thumb";

/** Parse ?body=flight|thumb. Invalid / missing → null (use device default). */
export function readAscentBodyOverride(raw: string | null | undefined): AscentBodyId | null {
  const v = (raw || "").trim().toLowerCase();
  if (v === "flight" || v === "thumb") return v;
  return null;
}

function readBodyFromLocation(): AscentBodyId | null {
  if (typeof window === "undefined") return null;
  try {
    return readAscentBodyOverride(new URLSearchParams(window.location.search).get("body"));
  } catch {
    return null;
  }
}

export default function AscentGate() {
  const isMobile = useIsMobile();
  const isTouch = useIsTouch();
  // Sync from location on first client paint — no "Loading Ascent…" interstitial.
  const [override, setOverride] = useState<AscentBodyId | null>(() => readBodyFromLocation());

  useEffect(() => {
    setOverride(readBodyFromLocation());
    const onNav = () => setOverride(readBodyFromLocation());
    window.addEventListener("popstate", onNav);
    return () => window.removeEventListener("popstate", onNav);
  }, []);

  const body: AscentBodyId = override ?? (isMobile ? "thumb" : "flight");

  if (body === "thumb") return <MobileShell />;
  // Flight on phone/tablet (incl. landscape >640px) → lite GPU; full Grounds melts mobile WebGL.
  return <GroundsScreen ascentEntry gpuLite={isMobile || isTouch} />;
}
