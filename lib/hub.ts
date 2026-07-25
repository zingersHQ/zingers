// ─────────────────────────────────────────────────────────────────────────────
// Hub-and-spoke — the navigation backbone for the design north star: ONE world,
// entered at three session-lengths (docs/bible/README.md).
//
//   Roam  (open-ended)  → the Grounds: live in the world, watch the league
//   Quick (2–5 min)     → drop in, fight one ranked duel, hold your rank
//   Raise (15–60 min)   → the growing RPG: campaign, collection, self-improvement
//
// This is pure data so the Grounds (the hub) and any menu can route consistently.
// `planned` marks spokes whose screens aren't built yet — the model leads the UI.
// ─────────────────────────────────────────────────────────────────────────────

export type LayerId = "roam" | "quick" | "raise";

export interface Spoke {
  id: string;
  label: string;
  href: string;
  blurb: string;
  planned?: boolean; // screen not built yet (build target, not dead link)
}

export interface Layer {
  id: LayerId;
  name: string;
  /** the player-facing promise of this session-length */
  pitch: string;
  /** rough session length */
  session: string;
  /** the touchstone game it should feel like */
  reference: string;
  /** the route that *is* this layer (its home) */
  home: string;
  spokes: Spoke[];
}

export const LAYERS: Layer[] = [
  {
    id: "roam",
    name: "The Grounds",
    pitch: "Live in the world. Walk it, watch the league happen, find a fight.",
    session: "open-ended",
    reference: "GTA: go around",
    home: "/",
    spokes: [
      { id: "world", label: "Explore the world", href: "/", blurb: "The 3D world. Champions wander, the Tower looms." },
    ],
  },
  {
    id: "quick",
    name: "The Ring",
    pitch: "Two minutes, one fight, hold your rank.",
    session: "2–5 min",
    reference: "Fortnite: a quick match",
    home: "/arena",
    spokes: [
      { id: "arena", label: "Ranked Duel", href: "/arena", blurb: "1v1 debate combat, streamed turn-by-turn." },
      { id: "league", label: "Live League", href: "/", blurb: "The Live Gallery in the Concord hub: autonomous fights, live standings." },
      { id: "standings", label: "Rank", href: "/standings", blurb: "Season standings. Where your rank lives." },
      { id: "daily", label: "Daily Zinger", href: "/", blurb: "The Daily Tribunal stone in the Concord: one shared call a day." },
    ],
  },
  {
    id: "raise",
    name: "The Long Game",
    pitch: "Raise minds, evolve their bodies, climb through the seasons, build a collection.",
    session: "15–60 min",
    reference: "Pokémon: play a while",
    home: "/collection",
    spokes: [
      { id: "guardian", label: "The Keepers", href: "/", blurb: "The campaign: climb a region's spire and coax the secret word out of its Keeper, one of five minds guarding the sealed Long Vault." },
      { id: "agents", label: "Self-Improve", href: "/agents", blurb: "Watch a champion reflect and retune its own strategy to climb." },
      { id: "collection", label: "The Collection", href: "/collection", blurb: "Your dex of minds: evolving cards, sigils, sagas, rarity." },
      { id: "champion", label: "Champion Profile", href: "/collection", blurb: "Open any card to see a single mind's full record, body, and saga." },
    ],
  },
];

export const LAYER_BY_ID: Record<LayerId, Layer> = Object.fromEntries(LAYERS.map((l) => [l.id, l])) as Record<LayerId, Layer>;

// Which layer a route belongs to (longest-prefix match; defaults to roam/home).
export function layerOfRoute(path: string): LayerId {
  let best: { id: LayerId; len: number } = { id: "roam", len: -1 };
  for (const layer of LAYERS) {
    for (const s of layer.spokes) {
      const href = s.href;
      const hit = path === href || (href !== "/" && path.startsWith(href + "/")) || (href !== "/" && path.startsWith(href));
      if (hit && href.length > best.len) best = { id: layer.id, len: href.length };
    }
  }
  return best.id;
}

// The built (non-planned) spokes, for menus that should only show live screens.
export function liveSpokes(id: LayerId): Spoke[] {
  return (LAYER_BY_ID[id]?.spokes ?? []).filter((s) => !s.planned);
}
