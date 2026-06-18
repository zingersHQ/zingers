import { BRAND } from "@/lib/brand";

const ORG_HOSTS = new Set(["zingers.org", "www.zingers.org"]);

/** True when the request is served on the docs domain (zingers.org). */
export function isOrgHost(host: string): boolean {
  const bare = host.split(":")[0]?.toLowerCase() ?? "";
  return ORG_HOSTS.has(bare);
}

/** Public href for a docs slug — clean on .org, prefixed on .gg / localhost. */
export function orgHref(slug: string, host: string): string {
  if (isOrgHost(host)) return slug ? `/${slug}` : "/";
  return slug ? `/org/${slug}` : "/org";
}

/** Canonical absolute URL for a docs page (always zingers.org). */
export function orgCanonical(slug?: string): string {
  const base = BRAND.siteTech.replace(/\/$/, "");
  if (!slug) return base;
  return `${base}/${slug}`;
}

/** Game-only paths — not served on zingers.org. */
export const GAME_PATH_PREFIXES = [
  "/arena",
  "/league",
  "/standings",
  "/guardian",
  "/house",
  "/daily",
  "/collection",
  "/grounds",
  "/champion",
  "/c",
  "/slides",
  "/howitworks",
  "/readme",
  "/agents",
] as const;

/** First URL segment that maps to docs content on zingers.org. */
export const ORG_DOC_ROOTS = new Set(["bible", "protocol", "design", "product"]);

/** Static assets and Next internals — never rewritten. */
export function isPublicAsset(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/img/") || pathname.startsWith("/models/")) return true;
  if (/\.(ico|png|jpg|jpeg|svg|webp|glb|txt|xml|json)$/i.test(pathname)) return true;
  return false;
}

export function isGamePath(pathname: string): boolean {
  return GAME_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
