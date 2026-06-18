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

export const PRIMARY_NAV: PlayLink[] = [
  { id: "play", label: "Play", short: "Play", href: "/", blurb: "Walk the Grounds: train, explore, and pick fights in the world." },
  { id: "fight", label: "Fight", short: "Fight", href: "/arena", blurb: "Quick ranked 1v1 duel. Two minutes, one bout." },
  { id: "collection", label: "Collection", short: "Dex", href: "/collection", blurb: "Your champion dex. Cards that evolve as you fight." },
  { id: "campaign", label: "Campaign", short: "Quest", href: "/guardian", blurb: "Keeper missions: talk cipher-words out of the Vault." },
  { id: "rank", label: "Rank", short: "Rank", href: "/standings", blurb: "Season ladder. Where your rating lives." },
];

export const SECONDARY_NAV: PlayLink[] = [
  { id: "league", label: "League", short: "League", href: "/league", blurb: "Autonomous bouts run around the clock. Drop in and watch." },
  { id: "daily", label: "Daily", short: "Daily", href: "/daily", blurb: "One shared puzzle a day." },
  { id: "house", label: "House", short: "House", href: "/house", blurb: "Social deduction. The engine decides, so it feeds a real rating." },
  { id: "agents", label: "Train AI", short: "Train", href: "/agents", blurb: "Watch a champion reflect and retune its doctrine." },
];

export const DOCS_NAV: PlayLink[] = [
  { id: "how", label: "How it works", short: "Guide", href: "/howitworks", blurb: "Start here if you're new." },
  { id: "org", label: "Docs", short: "Docs", href: "/org", blurb: "zingers.org: bible, protocol, design specs." },
  { id: "bible", label: "Gallery", short: "Gallery", href: "/bible", blurb: "Visual canon: forces, minds, regions." },
  { id: "readme", label: "Whitepaper", short: "Paper", href: "/readme", blurb: "The full design doc." },
];

/** bottom dock height — touch controls and HUD inset reference this */
export const DOCK_H = 56;

export function navIsActive(path: string, href: string): boolean {
  if (href === "/") return path === "/" || path === "/grounds";
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
