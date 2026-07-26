import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";

/** Append or replace `lang=` on a battle (or any) URL. */
export function withLang(url: string, locale: Locale | string | null | undefined): string {
  const lang = isLocale(locale) ? locale : DEFAULT_LOCALE;
  try {
    // Absolute or relative
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const u = new URL(url);
      u.searchParams.set("lang", lang);
      return u.toString();
    }
    const q = url.includes("?") ? url.slice(url.indexOf("?")) : "";
    const path = url.includes("?") ? url.slice(0, url.indexOf("?")) : url;
    const params = new URLSearchParams(q.startsWith("?") ? q.slice(1) : q);
    params.set("lang", lang);
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}lang=${lang}`;
  }
}
