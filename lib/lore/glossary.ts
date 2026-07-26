// ─────────────────────────────────────────────────────────────────────────────
// Glossary — the single, plain-language definition of every signature term a
// player meets. English source: lib/lore/glossary/en.json. Locales: es/zh/ru/ja.
//
// The in-app page (/glossary) and the Bible glossary (docs/bible/09-glossary.md)
// both draw from these same definitions. See docs/vocabulary.md and
// docs/i18n/terminology.md.
// ─────────────────────────────────────────────────────────────────────────────

import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";
import en from "./glossary/en.json";
import es from "./glossary/es.json";
import zh from "./glossary/zh.json";
import ru from "./glossary/ru.json";
import ja from "./glossary/ja.json";

export interface GlossaryEntry {
  /** the term as a player sees it */
  term: string;
  /** one plain sentence — no other jargon inside it */
  short: string;
  /** older word we moved away from, shown as "was: …" so returning players aren't lost */
  was?: string;
}

export interface GlossaryGroup {
  id: string;
  title: string;
  entries: GlossaryEntry[];
}

const PACKS: Record<Locale, GlossaryGroup[]> = {
  en: en as GlossaryGroup[],
  es: es as GlossaryGroup[],
  zh: zh as GlossaryGroup[],
  ru: ru as GlossaryGroup[],
  ja: ja as GlossaryGroup[],
};

/** English canonical (source of truth for writers). */
export const GLOSSARY: GlossaryGroup[] = PACKS.en;

export function getGlossary(locale?: string | null): GlossaryGroup[] {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return PACKS[loc] ?? PACKS.en;
}

/** Flat lookup for inline glosses / search (English keys). */
export const GLOSSARY_BY_TERM: Record<string, GlossaryEntry> = Object.fromEntries(
  GLOSSARY.flatMap((g) => g.entries).map((e) => [e.term.toLowerCase(), e]),
);
