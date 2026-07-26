"use client";

import { persistLocale } from "@/lib/i18n/cookie";
import type { Locale } from "@/lib/i18n/locales";
import { useSettings } from "@/store/settings";

/**
 * User-initiated locale change. Writes localStorage + cookie synchronously,
 * updates settings, then reloads once so SSR messages match.
 */
export function applyLocale(locale: Locale) {
  persistLocale(locale);
  useSettings.setState({ locale });
  // Keep the settings blob in sync even if persist middleware hasn't flushed.
  try {
    const key = useSettings.persist.getOptions().name;
    if (key && typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as { state?: Record<string, unknown>; version?: number };
        parsed.state = { ...(parsed.state ?? {}), locale };
        localStorage.setItem(key, JSON.stringify(parsed));
      }
    }
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}
