"use client";
import { AmbienceEngine, AmbientToggle } from "@/components/grounds/ambience";

/** Floating sound control for full-screen onboarding overlays. Also hosts the
 *  ambience engine so the score plays during onboarding (before the world's own
 *  persistent host mounts). */
export function OnboardingAudio({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ position: "fixed", top: 14, right: 72, zIndex: 90, pointerEvents: "auto" }}>
      <AmbienceEngine />
      <AmbientToggle compact={compact} />
    </div>
  );
}
