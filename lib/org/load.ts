import fs from "node:fs/promises";
import path from "node:path";
import { ORG_FILE_HREF } from "@/lib/org/registry";

/** Static repo root — registry paths are always under docs/ or mcp/. */
const REPO = path.join(/* turbopackIgnore: true */ process.cwd());

function resolveMdHref(sourceFile: string, href: string): string | null {
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("/")) return null;
  const dir = path.dirname(sourceFile);
  const resolved = path.normalize(path.join(dir, href)).replace(/\\/g, "/");
  return ORG_FILE_HREF.get(resolved) ?? ORG_FILE_HREF.get(path.basename(resolved)) ?? null;
}

/** Rewrite repo-relative asset and doc links for zingers.org rendering. */
export function preprocessMarkdown(raw: string, sourceFile: string): string {
  let s = raw;

  // public assets → site root
  s = s.replace(/\]\(\.\.\/\.\.\/public(\/[^)]+)\)/g, "]($1)");
  s = s.replace(/\]\(\.\.\/public(\/[^)]+)\)/g, "]($1)");

  // markdown cross-links
  s = s.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (match, text: string, href: string) => {
    if (!href.endsWith(".md")) return match;
    const target = resolveMdHref(sourceFile, href);
    return target ? `[${text}](${target})` : match;
  });

  return s;
}

export async function loadOrgMarkdown(sourceFile: string): Promise<string> {
  const abs = path.join(REPO, sourceFile);
  const raw = await fs.readFile(abs, "utf8");
  return preprocessMarkdown(raw, sourceFile);
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
