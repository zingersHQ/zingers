"use client";
// Mobile / WebGL graphics tier — keep Climb playable on weak phones, but don't
// force flagships onto the lowest path forever. Heuristics only (no benchmark).
import { useEffect, useState } from "react";
import { gpuStatus } from "@/components/grounds/render-guard";

export type GraphicsTier = "low" | "mid" | "high";

type NavMem = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

/** Known strong mobile / laptop GPU name fragments (UNMASKED_RENDERER_WEBGL). */
const STRONG_GPU =
  /adreno \(7|adreno \(8|adreno \(1\d{2}|immortalis|mali-g7|mali-g8|mali-g9|xclipse|apple gpu|apple m\d|nvidia|radeon|geforce|intel arc/i;

function detectGraphicsTier(): GraphicsTier {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "mid";

  const gpu = gpuStatus();
  if (!gpu.ok || gpu.software) return "low";

  const nav = navigator as NavMem;
  const mem = nav.deviceMemory; // Chrome; often undefined on iOS Safari
  const cores = navigator.hardwareConcurrency ?? 4;
  const conn = nav.connection;
  if (conn?.saveData) return "low";
  if (conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") return "low";

  const strongGpu = STRONG_GPU.test(gpu.renderer);
  // Flagship / recent high-end (S22+ class, recent iPhones, gaming tablets).
  if (strongGpu && (mem == null || mem >= 6) && cores >= 6) return "high";
  if ((mem == null || mem >= 8) && cores >= 8) return "high";

  // Very constrained hardware — stay on the original Climb lite path.
  if (mem != null && mem <= 3) return "low";
  if (cores <= 4 && mem != null && mem <= 4) return "low";

  return "mid";
}

/** SSR-safe: starts at `mid`, then settles to the probed tier after mount. */
export function useGraphicsTier(): GraphicsTier {
  const [tier, setTier] = useState<GraphicsTier>("mid");
  useEffect(() => {
    setTier(detectGraphicsTier());
  }, []);
  return tier;
}

export type ClimbCanvasGfx = {
  shadows: boolean;
  dpr: number | [number, number];
  antialias: boolean;
  powerPreference: WebGLPowerPreference;
  liteLights: boolean;
  far: number;
  shadowMapSize: number;
};

/** Canvas / light knobs for Climb. `embedded` = in-shell phone Climb tab. */
export function climbCanvasGfx(tier: GraphicsTier, embedded: boolean): ClimbCanvasGfx {
  // Standalone / desktop Circuit-lite already had a healthier default.
  if (!embedded) {
    return {
      shadows: true,
      dpr: [1, 1.5],
      antialias: true,
      powerPreference: "high-performance",
      liteLights: false,
      far: 600,
      shadowMapSize: 1024,
    };
  }
  switch (tier) {
    case "high":
      return {
        shadows: true,
        dpr: [1, 2],
        antialias: true,
        powerPreference: "high-performance",
        liteLights: false,
        far: 480,
        shadowMapSize: 1024,
      };
    case "mid":
      return {
        shadows: false,
        dpr: [1, 1.5],
        antialias: true,
        powerPreference: "high-performance",
        liteLights: true,
        far: 360,
        shadowMapSize: 512,
      };
    default:
      return {
        shadows: false,
        dpr: 1,
        antialias: false,
        powerPreference: "default",
        liteLights: true,
        far: 320,
        shadowMapSize: 512,
      };
  }
}
