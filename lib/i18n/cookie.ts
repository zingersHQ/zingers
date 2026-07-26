"use client";

import { STORAGE } from "@/lib/brand";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n/locales";

const MAX_AGE = 60 * 60 * 24 * 365;

/** Persist locale for SSR (next-intl). Path=/ so it sticks across the host. */
export function setLocaleCookie(locale: Locale) {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)};path=/;max-age=${MAX_AGE};samesite=lax`;
}

export function readLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  if (!m) return null;
  const raw = decodeURIComponent(m[1]);
  return isLocale(raw) ? raw : null;
}

/** Durable client preference — survives refresh on this origin. */
export function readStoredLocale(): Locale | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE.locale);
    if (isLocale(raw)) return raw;
    // Fallback: settings blob (older sessions)
    const blob = localStorage.getItem(STORAGE.settings);
    if (blob) {
      const parsed = JSON.parse(blob) as { state?: { locale?: string } };
      if (isLocale(parsed?.state?.locale)) return parsed.state.locale;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeStoredLocale(locale: Locale) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE.locale, locale);
  } catch {
    /* private mode / quota */
  }
}

/** Write localStorage + cookie together. Call before reload. */
export function persistLocale(locale: Locale) {
  writeStoredLocale(locale);
  setLocaleCookie(locale);
}

export function resolveClientLocale(fallback: Locale = DEFAULT_LOCALE): Locale {
  return readStoredLocale() ?? readLocaleCookie() ?? fallback;
}
