"use client";

import { useTranslations } from "next-intl";

/** Localized fight vocabulary + Trainer lines (see also lib/player-copy.ts English constants). */
export function useFightCopy() {
  return useTranslations("fight");
}

export function usePlayerLines() {
  return useTranslations("player");
}
