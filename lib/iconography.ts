// Visual canon for UI — mirrors docs/bible/art-direction.md palette + Force hexes.
import type { CreatureType } from "@/lib/types";
import { FORCES } from "@/lib/lore/canon";

export const ICON = {
  void: "#0a0812",
  deep: "#15102a",
  gold: "#f5d020",
  /** Product CTA accent — purple lift on void (onboarding, hub banners) */
  accent: "#7c5cff",
} as const;

export function forceHex(type: CreatureType): string {
  return FORCES[type].hex;
}

export function forceSigil(type: CreatureType): string {
  return FORCES[type].sigil;
}

/** Onboarding shell gradient using canon void/deep field. */
export const ONBOARDING_BG =
  `radial-gradient(120% 90% at 50% 0%, ${ICON.deep} 0%, #07060d 60%, ${ICON.void} 100%), ${ICON.void}`;
