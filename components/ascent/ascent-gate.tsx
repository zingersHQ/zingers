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

function AscentSplash({ label = "Loading Ascent…" }: { label?: string }) {
  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "radial-gradient(120% 90% at 50% 8%, #1a2b4d 0%, #12112a 46%, #08070f 100%)",
        color: "#e6e2f5",
      }}
    >
      <div className="mono" style={{ fontSize: 12, letterSpacing: 2, opacity: 0.75 }}>
        {label}
      </div>
    </div>
  );
}

export default function AscentGate() {
  const isMobile = useIsMobile();
  const isTouch = useIsTouch();
  // Sync from location — avoid useSearchParams Suspense (can stall as a black wash on mobile).
  const [override, setOverride] = useState<AscentBodyId | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOverride(readBodyFromLocation());
    setReady(true);
    const onNav = () => setOverride(readBodyFromLocation());
    window.addEventListener("popstate", onNav);
    return () => window.removeEventListener("popstate", onNav);
  }, []);

  if (!ready) return <AscentSplash />;

  const body: AscentBodyId = override ?? (isMobile ? "thumb" : "flight");

  if (body === "thumb") return <MobileShell />;
  // Flight on phone/tablet (incl. landscape >640px) → lite GPU; full Grounds melts mobile WebGL.
  return <GroundsScreen ascentEntry gpuLite={isMobile || isTouch} />;
}
