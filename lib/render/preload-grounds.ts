"use client";
// Kick off heavy Grounds assets before the WebGL canvas mounts — used during
// onboarding so the first fight isn't blocked on a cold chunk + 50 glTFs.
import { useGLTF } from "@react-three/drei";
import { ALL_MODELS } from "@/lib/render/model-registry";
import { natureModelsForBiome, natureUrl } from "@/lib/render/nature-kit";

const preloadedBiomes = new Set<string>();

export function preloadChampionModels() {
  for (const m of ALL_MODELS) useGLTF.preload(m);
}

export function preloadNatureBiome(biomeId: string) {
  if (preloadedBiomes.has(biomeId)) return;
  preloadedBiomes.add(biomeId);
  for (const m of natureModelsForBiome(biomeId)) useGLTF.preload(natureUrl(m));
}

/** World chunk + the biome kit it will render. Safe to call from onboarding UI. */
export function warmGroundsChunk(biomeId: string) {
  preloadChampionModels();
  preloadNatureBiome(biomeId);
  void import("@/components/grounds/world");
}
