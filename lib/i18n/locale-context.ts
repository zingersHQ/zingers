/**
 * Process-local locale for server modules (battle, banter, character-beats)
 * that are not React components. Set at the start of each API request.
 */
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";

let current: Locale = DEFAULT_LOCALE;

export function setActiveLocale(locale: Locale | string | null | undefined) {
  current = isLocale(locale) ? locale : DEFAULT_LOCALE;
}

export function getActiveLocale(): Locale {
  return current;
}
