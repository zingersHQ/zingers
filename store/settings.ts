"use client";
// Player-facing options: audio, camera, accessibility, and language. Persisted
// locally so a player's feel preferences survive reloads. Read by the Settings
// overlay, the camera rig (sensitivity / invert / assist), the HUD (always-show),
// an audio bridge that pushes `volume` into the SFX/music/voice engines, and the
// i18n layer (`locale` → NEXT_LOCALE cookie + next-intl).
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { STORAGE } from "@/lib/brand";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";

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

  // language — player-facing UI, battles, docs
  locale: Locale;

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
  locale: DEFAULT_LOCALE,
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
      version: 2,
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<Settings>;
        let locale = isLocale(p.locale) ? p.locale : DEFAULT_LOCALE;
        try {
          const dedicated = localStorage.getItem(STORAGE.locale);
          if (isLocale(dedicated)) locale = dedicated;
        } catch {
          /* ignore */
        }
        if (version < 2 || !isLocale(p.locale)) {
          return { ...DEFAULTS, ...p, locale };
        }
        return { ...DEFAULTS, ...p, locale };
      },
    },
  ),
);
