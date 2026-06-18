"use client";
// Mounts the player-save sync once, globally, so progress made on any page
// (grounds, arena, house, daily) reconciles with the server. Renders nothing.
import { usePlayerSync } from "@/lib/player-sync";

export function PlayerSync() {
  usePlayerSync();
  return null;
}
