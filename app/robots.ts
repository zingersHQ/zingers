import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { BRAND } from "@/lib/brand";
import { isOrgHost } from "@/lib/org/hosts";

const PRIVATE = ["/admin", "/api/", "/art-studio", "/stats", "/dev/"];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const org = isOrgHost(host);
  const origin = org ? BRAND.siteTech : BRAND.site;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE,
    },
    sitemap: `${origin.replace(/\/$/, "")}/sitemap.xml`,
    host: origin.replace(/^https?:\/\//, "").replace(/\/$/, ""),
  };
}
