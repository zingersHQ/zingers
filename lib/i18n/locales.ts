/** Supported player locales. English is the source of truth. */
export const LOCALES = ["en", "es", "zh", "ru", "ja"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Cookie shared by game settings, SSR (next-intl), and org docs. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  zh: "中文",
  ru: "Русский",
  ja: "日本語",
};

/** Human language name for LLM prompts. */
export const LOCALE_LANGUAGE: Record<Locale, string> = {
  en: "English",
  es: "Spanish",
  zh: "Simplified Chinese",
  ru: "Russian",
  ja: "Japanese",
};

/**
 * Length caps for trash-talk bars (replaces English "MAX 14 words").
 * ZH/JA use character counts; others use word counts.
 */
export const LINE_LIMIT: Record<
  Locale,
  { unit: "words" | "chars"; max: number; prompt: string }
> = {
  en: { unit: "words", max: 14, prompt: "MAX 14 words" },
  es: { unit: "words", max: 16, prompt: "MAX 16 words" },
  zh: { unit: "chars", max: 28, prompt: "MAX 28 Chinese characters" },
  ru: { unit: "words", max: 14, prompt: "MAX 14 words" },
  ja: { unit: "chars", max: 36, prompt: "MAX 36 Japanese characters (including kana/kanji)" },
};

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** Map navigator / Accept-Language tags onto our five codes. */
export function normalizeLocale(raw: string | null | undefined): Locale {
  if (!raw) return DEFAULT_LOCALE;
  const tag = raw.trim().toLowerCase().replace("_", "-");
  if (tag.startsWith("es")) return "es";
  if (tag.startsWith("zh")) return "zh";
  if (tag.startsWith("ru")) return "ru";
  if (tag.startsWith("ja")) return "ja";
  if (tag.startsWith("en")) return "en";
  const base = tag.split("-")[0];
  if (isLocale(base)) return base;
  return DEFAULT_LOCALE;
}

export function parseLocaleParam(raw: string | null | undefined): Locale {
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}
