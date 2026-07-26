/**
 * Multi-locale baked mind banks.
 * English (`en.ts`) is always present. Other locales fall back to English until
 * `npm run bake:minds -- --locale <code>` has been run for that locale.
 */
import type { Creature } from "@/lib/engine/roster";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";

import * as en from "./en";

export type BakedBanks = {
  BAKED_MIND_KEYS: readonly string[];
  BAKED_CREATURES: Record<string, Creature>;
  BAKED_WAKE: Record<string, string>;
  BAKED_IMPRINT_ASK: Record<string, string>;
  BAKED_FLIGHT_REACT: Record<string, [string, string]>;
  BAKED_GREETING: Record<string, { train: string; return: string; arena: string }>;
  BAKED_HOMECOMING: Record<string, { away: string; hot: string; cold: string }>;
  BAKED_AFTER_FIGHT: Record<string, { win: string; loss: string }>;
  BAKED_IMPRINT_ACK: Record<string, string>;
  BAKED_RANKED_FINALE: Record<string, string>;
  BAKED_BANTER: Record<string, string[]>;
  BAKED_FIRST_DUEL_HOOKS: Record<string, string>;
  BAKED_ORIGIN_AXIS: Record<string, "aggression" | "control" | "resilience" | "flair" | "creativity">;
  BAKED_STARTERS_BY_FORCE: Partial<
    Record<"LOGIC" | "CHAOS" | "COMPOSURE" | "RHETORIC" | "CREATIVITY", string[]>
  >;
  BAKED_SHOWCASE: Record<string, Record<string, number>>;
};

const cache = new Map<Locale, BakedBanks>();
cache.set("en", en as unknown as BakedBanks);

async function loadLocale(locale: Locale): Promise<BakedBanks> {
  if (cache.has(locale)) return cache.get(locale)!;
  if (locale === "en") return en as unknown as BakedBanks;
  try {
    const mod = (await import(`./${locale}`)) as BakedBanks;
    cache.set(locale, mod);
    return mod;
  } catch {
    cache.set(locale, en as unknown as BakedBanks);
    return en as unknown as BakedBanks;
  }
}

/** Sync accessor — English always; other locales only if already loaded / baked as sync import. */
const syncExtras: Partial<Record<Locale, BakedBanks>> = {};

export function registerBakedSync(locale: Locale, banks: BakedBanks) {
  syncExtras[locale] = banks;
  cache.set(locale, banks);
}

export function getBakedSync(locale: Locale | string | null | undefined): BakedBanks {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return syncExtras[loc] ?? (cache.get(loc) as BakedBanks | undefined) ?? (en as unknown as BakedBanks);
}

export async function getBaked(locale: Locale | string | null | undefined): Promise<BakedBanks> {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return loadLocale(loc);
}

// Default English re-exports — keep existing `@/lib/minds/baked` imports working.
export const BAKED_MIND_KEYS = en.BAKED_MIND_KEYS;
export const BAKED_CREATURES = en.BAKED_CREATURES;
export const BAKED_WAKE = en.BAKED_WAKE;
export const BAKED_IMPRINT_ASK = en.BAKED_IMPRINT_ASK;
export const BAKED_FLIGHT_REACT = en.BAKED_FLIGHT_REACT;
export const BAKED_GREETING = en.BAKED_GREETING;
export const BAKED_HOMECOMING = en.BAKED_HOMECOMING;
export const BAKED_AFTER_FIGHT = en.BAKED_AFTER_FIGHT;
export const BAKED_IMPRINT_ACK = en.BAKED_IMPRINT_ACK;
export const BAKED_RANKED_FINALE = en.BAKED_RANKED_FINALE;
export const BAKED_BANTER = en.BAKED_BANTER;
export const BAKED_FIRST_DUEL_HOOKS = en.BAKED_FIRST_DUEL_HOOKS;
export const BAKED_ORIGIN_AXIS = en.BAKED_ORIGIN_AXIS;
export const BAKED_STARTERS_BY_FORCE = en.BAKED_STARTERS_BY_FORCE;
export const BAKED_SHOWCASE = en.BAKED_SHOWCASE;
