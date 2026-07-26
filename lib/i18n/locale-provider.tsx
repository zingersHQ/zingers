"use client";

import { useEffect, useRef } from "react";
import { NextIntlClientProvider } from "next-intl";
import { useSettings } from "@/store/settings";
import {
  DEFAULT_LOCALE,
  isLocale,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/locales";
import { readLocaleCookie, setLocaleCookie } from "@/lib/i18n/cookie";
import { setActiveLocale } from "@/lib/i18n/locale-context";
import { getBaked, registerBakedSync } from "@/lib/minds/baked";

type Messages = Record<string, unknown>;

/**
 * Boots locale from cookie / navigator when unset, keeps cookie in sync with
 * settings, and provides next-intl messages to the client tree.
 */
export function LocaleProvider({
  locale: serverLocale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const locale = useSettings((s) => s.locale);
  const set = useSettings((s) => s.set);
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const fromCookie = readLocaleCookie();
    if (isLocale(fromCookie) && fromCookie !== locale) {
      set({ locale: fromCookie });
      return;
    }
    if (!fromCookie && locale === DEFAULT_LOCALE && typeof navigator !== "undefined") {
      const detected = normalizeLocale(navigator.language);
      if (detected !== DEFAULT_LOCALE) {
        set({ locale: detected });
        setLocaleCookie(detected);
        return;
      }
    }
    setLocaleCookie(locale);
  }, [locale, set]);

  useEffect(() => {
    setLocaleCookie(locale);
    setActiveLocale(locale);
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale === "zh" ? "zh-Hans" : locale;
    }
    void getBaked(locale).then((banks) => registerBakedSync(locale, banks));
  }, [locale]);

  // When the player switches language, reload so SSR messages + baked banks match.
  const prev = useRef(serverLocale);
  useEffect(() => {
    if (prev.current !== locale && locale !== serverLocale) {
      prev.current = locale;
      window.location.reload();
    }
  }, [locale, serverLocale]);

  return (
    <NextIntlClientProvider locale={serverLocale} messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}
