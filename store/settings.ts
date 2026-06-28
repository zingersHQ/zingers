"use client";
// Player-facing options: audio, camera, and accessibility. Persisted locally so a
// player's feel preferences survive reloads. Read by the Settings overlay, the
// camera rig (sensitivity / invert / assist), the HUD (always-show), and an audio
// bridge that pushes `volume` into the SFX, music and voice engines.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { STORAGE } from "@/lib/brand";

export interface Settings {
  // audio — `volume` is a 0..1 master scalar over SFX + music + voice; the on/off
  // master mute still lives in STORAGE.sound (the existing AmbientToggle).
  volume: number;
  voice: boolean; // creature "voice" blips on/off

  // camera
  camSensitivity: number; // 0.4..2.0 multiplier on look speed
  invertY: boolean;
  camAssist: boolean; // smart auto-follow that re-frames behind the player

  // accessibility / comfort
  reduceMotion: boolean; // damp camera swell / action-cam punches + decorative anim
  alwaysShowHud: boolean; // never auto-dim the HUD when idle

  set: (p: Partial<Omit<Settings, "set" | "reset">>) => void;
  reset: () => void;
}

const DEFAULTS: Omit<Settings, "set" | "reset"> = {
  volume: 0.8,
  voice: true,
  camSensitivity: 1,
  invertY: false,
  camAssist: true,
  reduceMotion: false,
  alwaysShowHud: false,
};

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (p) => set(p),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: STORAGE.settings,
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
