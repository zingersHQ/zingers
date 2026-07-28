import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { BRAND } from "@/lib/brand";
import { isOrgHost } from "@/lib/org/hosts";
import { ORG_PAGES } from "@/lib/org/registry";

const ORG_LOCALES = ["es", "zh", "ru", "ja"] as const;

function orgLocaleAlternates(path: string): MetadataRoute.Sitemap[number]["alternates"] {
  const base = BRAND.siteTech.replace(/\/$/, "");
  const clean = path.replace(/^\//, "");
  const languages: Record<string, string> = {
    en: clean ? `${base}/${clean}` : base,
  };
  for (const locale of ORG_LOCALES) {
    languages[locale] = clean ? `${base}/${locale}/${clean}` : `${base}/${locale}`;
  }
  return { languages };
}

function orgSitemap(): MetadataRoute.Sitemap {
  const base = BRAND.siteTech.replace(/\/$/, "");
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
      alternates: orgLocaleAlternates(""),
    },
    {
      url: `${base}/press`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  for (const page of ORG_PAGES) {
    entries.push({
      url: `${base}/${page.slug}`,
      lastModified: now,
      changeFrequency: page.section === "bible" ? "weekly" : "monthly",
      priority: page.order === 0 ? 0.9 : 0.8,
      alternates: orgLocaleAlternates(page.slug),
    });
  }

  return entries;
}

/** Public game-host pages worth indexing (not the full app surface). */
function gameSitemap(): MetadataRoute.Sitemap {
  const base = BRAND.site.replace(/\/$/, "");
  const now = new Date();
  const paths: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/ascent", priority: 0.9, changeFrequency: "weekly" },
    { path: "/glossary", priority: 0.8, changeFrequency: "monthly" },
    { path: "/bible", priority: 0.7, changeFrequency: "monthly" },
    { path: "/standings", priority: 0.7, changeFrequency: "daily" },
    { path: "/howitworks", priority: 0.6, changeFrequency: "monthly" },
    { path: "/readme", priority: 0.5, changeFrequency: "monthly" },
    { path: "/agents", priority: 0.5, changeFrequency: "monthly" },
  ];

  return paths.map(({ path, priority, changeFrequency }) => ({
    url: path ? `${base}${path}` : base,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("host")?.split(":")[0]?.toLowerCase() ?? "";
  return isOrgHost(host) ? orgSitemap() : gameSitemap();
}
