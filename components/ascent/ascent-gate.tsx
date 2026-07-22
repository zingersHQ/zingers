"use client";
// /ascent — one shareable door for the Ascent.
// Phone → light mobile shell (Climb body). Desktop → Grounds Circuit venue.
// Same URL, same challenge query (?climb=&gp=); device picks the body.
import { Suspense, useEffect, useState } from "react";
import { useIsMobile } from "@/lib/use-device";
import { MobileShell } from "@/components/mobile/mobile-shell";
import GroundsScreen from "@/components/grounds/grounds-screen";

function AscentBody() {
  const isMobile = useIsMobile();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  // Avoid mounting the wrong body for a frame (SSR + first paint are desktop-false).
  if (!ready) {
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

  if (isMobile) return <MobileShell />;
  // Desktop Ascent = Circuit venue inside the Grounds (not the full roam door).
  return <GroundsScreen ascentEntry gpuLite={false} />;
}

export default function AscentGate() {
  return (
    <Suspense
      fallback={
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            background: "radial-gradient(120% 90% at 50% 8%, #1a2b4d 0%, #12112a 46%, #08070f 100%)",
          }}
        />
      }
    >
      <AscentBody />
    </Suspense>
  );
}
