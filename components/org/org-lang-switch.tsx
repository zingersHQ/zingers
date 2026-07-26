"use client";

import { useSettings } from "@/store/settings";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/locales";
import { setLocaleCookie } from "@/lib/i18n/cookie";

/** Compact language picker for zingers.org shell. */
export function OrgLangSwitch() {
  const locale = useSettings((s) => s.locale);
  const set = useSettings((s) => s.set);

  const pick = (code: Locale) => {
    set({ locale: code });
    setLocaleCookie(code);
    // Reload so SSR markdown + messages match.
    window.location.reload();
  };

  return (
    <div className="org-lang" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => pick(code)}
          aria-pressed={locale === code}
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: 0.5,
            padding: "4px 8px",
            borderRadius: 6,
            border: locale === code ? "1px solid var(--gold, #d4a84b)" : "1px solid rgba(255,255,255,.12)",
            background: locale === code ? "rgba(212,168,75,.12)" : "transparent",
            color: "inherit",
            cursor: "pointer",
          }}
        >
          {LOCALE_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
