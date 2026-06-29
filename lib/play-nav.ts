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
}

export interface NavGroup {
  id: string;
  /** section heading shown above the group */
  label: string;
  items: PlayLink[];
}

// One legible menu, grouped by intent instead of a flat pile of modes:
//   Play  → the single door into the world (everything you DO lives inside it:
//           duels, gauntlet, tribunal, the Keeper campaign, training, the
//           Broker, the Clan war, plus the in-world Daily Tribunal & League).
//   You   → your own stuff and standing.
//   Learn → how the game + protocol work.
//   Build → the for-developers agent surface (not a game mode).
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "play",
    label: "Play",
    items: [
      { id: "play", label: "Play", short: "Play", href: "/grounds", blurb: "Walk the Grounds: train, explore, fight, and run the world's games." },
    ],
  },
  {
    id: "you",
    label: "You",
    items: [
      { id: "collection", label: "Collection", short: "Dex", href: "/collection", blurb: "Your champion dex. Cards that evolve as you fight." },
      { id: "rank", label: "Rank", short: "Rank", href: "/standings", blurb: "Season ladder. Where your rating lives." },
    ],
  },
  {
    id: "learn",
    label: "Learn",
    items: [
      { id: "how", label: "How it works", short: "Guide", href: "/howitworks", blurb: "Start here if you're new." },
      { id: "bible", label: "Gallery", short: "Gallery", href: "/bible", blurb: "Visual canon: forces, minds, regions." },
      { id: "catalogue", label: "Catalogue", short: "Cat", href: "/catalogue", blurb: "20 agents emulated from the real systems: every type, tier, and clan." },
      { id: "org", label: "Docs", short: "Docs", href: "/org", blurb: "zingers.org: bible, protocol, design specs." },
      { id: "readme", label: "Whitepaper", short: "Paper", href: "/readme", blurb: "The full design doc." },
    ],
  },
  {
    id: "build",
    label: "Build",
    items: [
      { id: "agents", label: "Train AI", short: "Train", href: "/agents", blurb: "Plug in your own AI agent and deploy it to the ladder or over MCP." },
    ],
  },
];

/** no bottom bar anymore — the menu is a top-left button. Kept at 0 so callers
 *  that still add it to padding/insets don't reserve dead space. */
export const DOCK_H = 0;

// The immersive 3D world. These keep the in-game hamburger (GameMenu) as their
// primary chrome and hide the top site header, since a web nav bar fights the
// full-screen scene. Every other surface (including the `/` landing page) gets
// the shared header.
export const WORLD_ROUTES = ["/grounds"];

export function isWorldRoute(path: string): boolean {
  return WORLD_ROUTES.some((p) => path === p || path.startsWith(p + "/"));
}

/** Whether the shared top site header (components/nav.tsx) is hidden for a path.
 *  Single source of truth so the header and the in-game menu agree on chrome. */
export function siteNavHidden(path: string, onOrg: boolean): boolean {
  if (path.startsWith("/slides") || path.startsWith("/render")) return true;
  // The Observatory is a full-screen, console-style 3D dashboard with its own
  // chrome (incl. a "Game" back button), so the web header would only fight it.
  if (path === "/stats" || path.startsWith("/stats/")) return true;
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
