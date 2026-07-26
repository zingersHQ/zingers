"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useSettings } from "@/store/settings";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/locales";
import { applyLocale } from "@/lib/i18n/apply-locale";

const SHORT: Record<Locale, string> = {
  en: "EN",
  es: "ES",
  zh: "中文",
  ru: "RU",
  ja: "JA",
};

type Variant = "nav" | "floating" | "hub";

/**
 * Compact language control: shows current short code (EN) with a dropdown of
 * EN / ES / 中文 / RU / JA. Used in site header, landing chrome, and Player Hub.
 */
export function LocaleDropdown({
  variant = "nav",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const locale = useSettings((s) => s.locale);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // pointerdown covers mouse + touch (phones never get a reliable mousedown-outside).
    document.addEventListener("pointerdown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (code: Locale) => {
    setOpen(false);
    if (code === locale) return;
    applyLocale(code);
  };

  const floating = variant === "floating";
  const hub = variant === "hub";

  return (
    <div
      ref={rootRef}
      className={`locale-dd locale-dd--${variant} ${className}`.trim()}
      style={
        floating
          ? { position: "fixed", top: 14, right: 16, zIndex: 95, pointerEvents: "auto" }
          : hub
            ? { position: "relative" }
            : { position: "relative" }
      }
    >
      <button
        type="button"
        className="locale-dd__btn mono"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        title={LOCALE_LABELS[locale]}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: hub ? "8px 12px" : "7px 10px",
          borderRadius: 9,
          border: "1px solid var(--line2)",
          background: floating || hub ? "var(--panel)" : "transparent",
          color: "var(--ink)",
          cursor: "pointer",
          fontSize: hub ? 12.5 : 11,
          fontWeight: 700,
          letterSpacing: 0.8,
          lineHeight: 1,
        }}
      >
        <span>{SHORT[locale]}</span>
        <ChevronDown size={12} strokeWidth={2.4} aria-hidden style={{ opacity: 0.7 }} />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Language"
          className="panel"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 148,
            margin: 0,
            padding: 6,
            listStyle: "none",
            zIndex: 100,
            boxShadow: "0 12px 32px rgba(0,0,0,.35)",
          }}
        >
          {LOCALES.map((code) => {
            const on = code === locale;
            return (
              <li key={code} role="option" aria-selected={on}>
                <button
                  type="button"
                  onClick={() => pick(code)}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: on ? "rgba(255,200,80,.12)" : "transparent",
                    color: "var(--ink)",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: on ? 700 : 500,
                    textAlign: "left",
                  }}
                >
                  <span>{LOCALE_LABELS[code]}</span>
                  <span className="mono" style={{ fontSize: 10, color: "var(--muted2)", letterSpacing: 0.5 }}>
                    {SHORT[code]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
