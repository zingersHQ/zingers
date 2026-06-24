"use client";
import { AmbientToggle } from "@/components/grounds/ambience";

/** Floating sound control for full-screen onboarding overlays. */
export function OnboardingAudio({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ position: "fixed", top: 14, right: 16, zIndex: 90, pointerEvents: "auto" }}>
      <AmbientToggle compact={compact} />
    </div>
  );
}
