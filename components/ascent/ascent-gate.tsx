"use client";
// /ascent — one shareable door for the Ascent.
// Default: phone → Climb (thumb body), desktop → Circuit (flight body).
// Override for QA / parity: ?body=flight | ?body=thumb
// Same challenge query (?climb=&gp=); body pick is independent of share door tags.
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useIsMobile } from "@/lib/use-device";
import { MobileShell } from "@/components/mobile/mobile-shell";
import GroundsScreen from "@/components/grounds/grounds-screen";

export type AscentBodyId = "flight" | "thumb";

/** Parse ?body=flight|thumb. Invalid / missing → null (use device default). */
export function readAscentBodyOverride(raw: string | null | undefined): AscentBodyId | null {
  const v = (raw || "").trim().toLowerCase();
  if (v === "flight" || v === "thumb") return v;
  return null;
}

function AscentSplash() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(120% 90% at 50% 8%, #1a2b4d 0%, #12112a 46%, #08070f 100%)",
      }}
    />
  );
}

function AscentBody() {
  const isMobile = useIsMobile();
  const sp = useSearchParams();
  const override = readAscentBodyOverride(sp.get("body"));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  // Avoid mounting the wrong body for a frame (SSR + first paint are desktop-false).
  if (!ready) return <AscentSplash />;

  const body: AscentBodyId = override ?? (isMobile ? "thumb" : "flight");

  if (body === "thumb") return <MobileShell />;
  // Flight body on a phone → lite GPU path (same as /grounds?world=1).
  return <GroundsScreen ascentEntry gpuLite={isMobile} />;
}

export default function AscentGate() {
  return (
    <Suspense fallback={<AscentSplash />}>
      <AscentBody />
    </Suspense>
  );
}
