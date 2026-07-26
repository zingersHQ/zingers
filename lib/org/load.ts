import fs from "node:fs/promises";
import path from "node:path";
import { ORG_FILE_HREF } from "@/lib/org/registry";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/locales";

/** Static repo root — registry paths are always under docs/ or mcp/. */
const REPO = path.join(/* turbopackIgnore: true */ process.cwd());

/** Resolve locale markdown: docs/i18n/{locale}/… with English fallback. */
export function resolveOrgSourceFile(sourceFile: string, locale?: string | null): string {
  const loc: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  if (loc === "en") return sourceFile;
  if (sourceFile.startsWith("docs/")) {
    return `docs/i18n/${loc}/${sourceFile.slice("docs/".length)}`;
  }
  if (sourceFile.startsWith("mcp/")) {
    return `docs/i18n/${loc}/${sourceFile}`;
  }
  return sourceFile;
}

function resolveMdHref(sourceFile: string, href: string): string | null {
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("/")) return null;
  const dir = path.dirname(sourceFile);
  const resolved = path.normalize(path.join(dir, href)).replace(/\\/g, "/");
  return ORG_FILE_HREF.get(resolved) ?? ORG_FILE_HREF.get(path.basename(resolved)) ?? null;
}

/** Rewrite repo-relative asset and doc links for zingers.org rendering. */
export function preprocessMarkdown(raw: string, sourceFile: string): string {
  let s = raw;

  // public assets → site root; prefer game renders over legacy AI bible art
  s = s.replace(/\]\(\.\.\/\.\.\/public(\/img\/bible\/minds\/mind-([a-z]+)\.png)\)/g, "](/renders/minds/$2.png)");
  s = s.replace(/\]\(\.\.\/\.\.\/public(\/img\/bible\/forces\/(force-[a-z]+)\.png)\)/g, "](/renders/forces/$2.png)");
  s = s.replace(/\]\(\.\.\/\.\.\/public(\/img\/bible\/regions\/(region-[a-z]+)\.png)\)/g, "](/renders/regions/$2.png)");
  s = s.replace(/\]\(\.\.\/\.\.\/public(\/img\/bible\/keepers\/(keeper-[a-z]+)\.png)\)/g, "](/renders/keepers/$2.png)");
  s = s.replace(/\]\(\.\.\/\.\.\/public(\/img\/[^)]+)\)/g, "]($1)");

  // markdown cross-links
  s = s.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (match, text: string, href: string) => {
    if (!href.endsWith(".md")) return match;
    const target = resolveMdHref(sourceFile, href);
    return target ? `[${text}](${target})` : match;
  });

  return s;
}

export async function loadOrgMarkdown(sourceFile: string, locale?: string | null): Promise<string> {
  const localized = resolveOrgSourceFile(sourceFile, locale);
  const tryFiles = localized === sourceFile ? [sourceFile] : [localized, sourceFile];
  let raw = "";
  let used = sourceFile;
  for (const rel of tryFiles) {
    try {
      raw = await fs.readFile(path.join(REPO, rel), "utf8");
      used = rel;
      break;
    } catch {
      /* try next */
    }
  }
  if (!raw) {
    raw = await fs.readFile(path.join(REPO, sourceFile), "utf8");
    used = sourceFile;
  }
  return preprocessMarkdown(raw, used.startsWith("docs/i18n/") ? sourceFile : used);
}

export function rewriteOrgHref(href: string | undefined): string | undefined {
  if (!href) return href;
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:")) return href;
  if (href.startsWith("/")) return href;
  if (href.endsWith(".md")) {
    const base = path.basename(href);
    return ORG_FILE_HREF.get(href) ?? ORG_FILE_HREF.get(base) ?? href;
  }
  return href;
}
