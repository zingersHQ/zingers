"use client";

import { useEffect, useRef } from "react";
import { NextIntlClientProvider } from "next-intl";
import { useSettings } from "@/store/settings";
import type { Locale } from "@/lib/i18n/locales";
import {
  persistLocale,
  readStoredLocale,
  setLocaleCookie,
} from "@/lib/i18n/cookie";
import { setActiveLocale } from "@/lib/i18n/locale-context";
import { getBaked, registerBakedSync } from "@/lib/minds/baked";

type Messages = Record<string, unknown>;

const SSR_SYNC_FLAG = "zingers_locale_ssr_sync";

/**
 * Durable localStorage preference wins. Cookie mirrors it for SSR.
 * If storage and SSR disagree, push cookie from storage and reload once.
 * If there is no stored preference yet, adopt the SSR/cookie locale.
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
  const didSync = useRef(false);

  useEffect(() => {
    if (didSync.current) return;

    const finish = () => {
      if (didSync.current) return;
      didSync.current = true;

      const stored = readStoredLocale();
      const preferred = stored ?? serverLocale;

      useSettings.setState({ locale: preferred });

      if (stored && stored !== serverLocale) {
        // Cookie lagged behind localStorage — push cookie and reload once.
        const alreadyTried =
          typeof sessionStorage !== "undefined" && sessionStorage.getItem(SSR_SYNC_FLAG) === stored;
        if (!alreadyTried) {
          try {
            sessionStorage.setItem(SSR_SYNC_FLAG, stored);
          } catch {
            /* ignore */
          }
          persistLocale(stored);
          window.location.reload();
          return;
        }
        // Still mismatched after a retry — keep preference without looping.
        setLocaleCookie(stored);
      } else {
        try {
          sessionStorage.removeItem(SSR_SYNC_FLAG);
        } catch {
          /* ignore */
        }
        // Settle: write dedicated key + cookie so refresh keeps this locale.
        persistLocale(preferred);
      }

      setActiveLocale(preferred);
      if (typeof document !== "undefined") {
        document.documentElement.lang = preferred === "zh" ? "zh-Hans" : preferred;
      }
      void getBaked(preferred).then((banks) => registerBakedSync(preferred, banks));
    };

    const persistApi = useSettings.persist;
    if (persistApi.hasHydrated()) {
      finish();
      return;
    }
    return persistApi.onFinishHydration(() => {
      finish();
    });
  }, [serverLocale]);

  return (
    <NextIntlClientProvider locale={serverLocale} messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}
