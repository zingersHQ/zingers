// Player-facing navigation — ordered for “what do I do first?”
// Keep labels plain; hub layers (roam/quick/raise) stay in lib/hub for lore/docs.

import { ORG_DOC_ROOTS, isOrgHost } from "@/lib/org/hosts";

export interface PlayLink {
  id: string;
  label: string;
  /** shorter label for the mobile dock */
  short: string;
  href: string;
  blurb: string;
  /** reference/doc links: shown in the site header, hidden from the in-world hubs
   *  (the M-menu + player-hub panel) to keep first-run chrome uncluttered. */
  secondary?: boolean;
}

export interface NavGroup {
  id: string;
  /** section heading shown above the group */
  label: string;
  items: PlayLink[];
}

// One legible menu, grouped by intent instead of a flat pile of modes:
//   Play  → the single door into the world (everything you DO lives inside it:
//           Climb/Circuit, duels, gauntlet, tribunal, training, the
//           Broker, the Clan war, plus the in-world Daily Tribunal & League).
//   You   → your own stuff and standing.
//   Learn → how the game + protocol work.
//   Build → the for-developers agent surface (not a game mode).
/** Desktop roam door into the 3D Grounds. */
export const PLAY_HREF = "/grounds";
/** Shared Ascent door — phone and desktop; device picks Climb vs Circuit body. */
export const ASCENT_HREF = "/ascent";
/** @deprecated use {@link ASCENT_HREF} — kept so old imports keep working. */
export const MOBILE_PLAY_HREF = ASCENT_HREF;

/** Primary “Play / Take flight” entry — Ascent on phones, Grounds roam on desktop. */
export function playEntryHref(isMobile: boolean): string {
  return isMobile ? ASCENT_HREF : PLAY_HREF;
}

/** Always the Ascent (challenge shares, Take flight CTA). */
export function ascentEntryHref(): string {
  return ASCENT_HREF;
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "play",
    label: "Play",
    items: [
      { id: "play", label: "Play", short: "Play", href: PLAY_HREF, blurb: "Explore the world: train, fight, and play its games." },
    ],
  },
  {
    id: "you",
    label: "You",
    items: [
      { id: "collection", label: "Collection", short: "Dex", href: "/collection", blurb: "Your champion dex. Cards that evolve as you fight." },
      { id: "rank", label: "Rank", short: "Rank", href: "/standings", blurb: "Season standings. Where your rating lives." },
    ],
  },
  {
    id: "learn",
    label: "Learn",
    items: [
      { id: "how", label: "How it works", short: "Guide", href: "/howitworks", blurb: "Start here if you're new." },
      { id: "bible", label: "Gallery", short: "Gallery", href: "/bible", blurb: "Visual canon: forces, minds, regions." },
      // Reference/doc links: kept in the site header but hidden from the in-world
      // hubs (secondary) so the M-menu / player-hub panel don't read as a doc dump.
      { id: "catalogue", label: "Catalogue", short: "Cat", href: "/catalogue", blurb: "20 agents emulated from the real systems: every type, tier, and clan.", secondary: true },
      { id: "org", label: "Docs", short: "Docs", href: "/org", blurb: "zingers.org: bible, protocol, design specs.", secondary: true },
      { id: "readme", label: "Whitepaper", short: "Paper", href: "/readme", blurb: "The full design doc.", secondary: true },
    ],
  },
  {
    id: "build",
    label: "Build",
    items: [
      { id: "agents", label: "Train AI", short: "Train", href: "/agents", blurb: "Plug in your own AI agent and deploy it to the standings or over MCP." },
    ],
  },
];

/** NAV_GROUPS for the immersive in-world hubs (the M-menu + player-hub panel):
 *  reference/doc links (`secondary`) are dropped and any now-empty group removed,
 *  so first-run chrome stays uncluttered. The site header still shows everything. */
export const HUB_NAV_GROUPS: NavGroup[] = NAV_GROUPS
  .map((g) => ({ ...g, items: g.items.filter((i) => !i.secondary) }))
  .filter((g) => g.items.length > 0);

/** no bottom bar anymore — the menu is a top-left button. Kept at 0 so callers
 *  that still add it to padding/insets don't reserve dead space. */
export const DOCK_H = 0;

// The immersive 3D world. These keep the in-game hamburger (GameMenu) as their
// primary chrome and hide the top site header, since a web nav bar fights the
// full-screen scene. Every other surface (including the `/` landing page) gets
// the shared header.
export const WORLD_ROUTES = ["/grounds", "/ascent"];

export function isWorldRoute(path: string): boolean {
  return WORLD_ROUTES.some((p) => path === p || path.startsWith(p + "/"));
}

/** Whether the shared top site header (components/nav.tsx) is hidden for a path.
 *  Single source of truth so the header and the in-game menu agree on chrome. */
export function siteNavHidden(path: string, onOrg: boolean): boolean {
  if (path.startsWith("/slides") || path.startsWith("/render")) return true;
  // Ascent shell (and legacy /m) carries its own chrome — no site header.
  if (path === "/ascent" || path.startsWith("/ascent/")) return true;
  if (path === "/m" || path.startsWith("/m/")) return true;
  // The Observatory is a full-screen, console-style 3D dashboard with its own
  // chrome (incl. a "Game" back button), so the web header would only fight it.
  if (path === "/stats" || path.startsWith("/stats/")) return true;
  // Champion career is an in-game surface (dex drill-down), not a public profile.
  // Own chrome: back-to-hub + GameMenu. Public share stays on /c/[key].
  if (path === "/champion" || path.startsWith("/champion/")) return true;
  // The game-domain landing (/) opens on the immersive intro deck, which carries
  // its own chrome (brand · progress dots · skip); a stacked web header fights it.
  if (!onOrg && path === "/") return true;
  if (!onOrg && isWorldRoute(path)) return true;
  return false;
}

export function navIsActive(path: string, href: string): boolean {
  return path === href || path.startsWith(href + "/");
}

/** Docs nav highlights on /org/* (game domain) and clean paths on zingers.org. */
export function docsNavIsActive(path: string, id: string, host?: string): boolean {
  if (id !== "org") return false;
  if (path === "/org" || path.startsWith("/org/")) return true;
  if (host && isOrgHost(host)) {
    if (path === "/") return true;
    const root = path.split("/").filter(Boolean)[0];
    return root ? ORG_DOC_ROOTS.has(root) : false;
  }
  return false;
}
