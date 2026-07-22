"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useIsMobile } from "@/lib/use-device";
import GroundsScreen from "@/components/grounds/grounds-screen";

/**
 * Phones default to /ascent (light Climb body) — the full 3D Grounds is
 * desktop-first and melts mobile GPUs. Pass ?world=1 to opt in anyway.
 */
export default function GroundsGate() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const sp = useSearchParams();
  const forceWorld = sp.get("world") === "1";

  useEffect(() => {
    if (isMobile && !forceWorld) {
      const q = sp.toString();
      router.replace(q ? `/ascent?${q}` : "/ascent");
    }
  }, [isMobile, forceWorld, router, sp]);

  if (isMobile && !forceWorld) return null;

  return <GroundsScreen gpuLite={isMobile} />;
}
