// zingers.org — canonical doc registry. Markdown source lives in docs/; routes live here.
export interface OrgSection {
  id: string;
  title: string;
  blurb: string;
}

export interface OrgPage {
  /** path under /org, e.g. "bible/cosmology" */
  slug: string;
  title: string;
  /** repo-relative markdown path */
  file: string;
  section: string;
  order: number;
  description?: string;
}

export const ORG_SECTIONS: OrgSection[] = [
  { id: "bible", title: "The Bible", blurb: "Canon: forces, minds, regions, Flight, seasons, collection, Vault lore." },
  { id: "protocol", title: "Protocol", blurb: "How agents plug in: contract, tools, MCP." },
  { id: "design", title: "Design", blurb: "Flight-First loop, combat math, retention, arenas." },
  { id: "product", title: "Product", blurb: "Pitch decks, positioning, and the press kit." },
];

export const ORG_PAGES: OrgPage[] = [
  // bible
  { slug: "bible", section: "bible", order: 0, title: "The Zingers Bible", file: "docs/bible/README.md", description: "Single source of truth for lore, names, and rules-as-fiction." },
  { slug: "bible/cosmology", section: "bible", order: 1, title: "Cosmology", file: "docs/bible/01-cosmology.md", description: "The Hum, the Long Vault, and why anyone fights." },
  { slug: "bible/forces", section: "bible", order: 2, title: "The Five Forces", file: "docs/bible/02-forces.md", description: "The type pentagon as in-world physics." },
  { slug: "bible/champions", section: "bible", order: 3, title: "Champions", file: "docs/bible/03-champions.md", description: "What a mind is; First Minds; the growing collectible dex." },
  { slug: "bible/keepers", section: "bible", order: 4, title: "The Keepers", file: "docs/bible/04-keepers.md", description: "Five Keepers of the Long Vault: canon lore; rite shelved from the face." },
  { slug: "bible/regions", section: "bible", order: 5, title: "Regions", file: "docs/bible/05-regions.md", description: "The map: Hub, regions, venues, Force bias, arenas." },
  { slug: "bible/seasons", section: "bible", order: 6, title: "Seasons", file: "docs/bible/06-seasons.md", description: "The Chronicle: generative, seeded living seasons." },
  { slug: "bible/collection", section: "bible", order: 7, title: "Collection", file: "docs/bible/07-collection.md", description: "Cards, rarity, lineage, weekly starters: the dex layer." },
  { slug: "bible/economy", section: "bible", order: 8, title: "Economy", file: "docs/bible/08-economy.md", description: "Crowns and the optional ownership layer beneath." },
  { slug: "bible/ascent", section: "bible", order: 9, title: "Flight", file: "docs/bible/10-ascent.md", description: "Vertical world: Reaches, Camps, Flight sigil, challenges." },
  { slug: "bible/art-direction", section: "bible", order: 10, title: "Art direction", file: "docs/bible/art-direction.md", description: "House visual canon: palette, prompts, brand mark, asset paths." },
  { slug: "bible/glossary", section: "bible", order: 11, title: "Glossary", file: "docs/bible/09-glossary.md", description: "Every term in one plain sentence for newcomers and non-native readers." },
  // protocol
  { slug: "protocol/agents", section: "protocol", order: 0, title: "Agent protocol", file: "docs/agent-protocol.md", description: "Bring-your-own-agent interface: act(view) → decision." },
  { slug: "protocol/mcp", section: "protocol", order: 1, title: "MCP server", file: "mcp/README.md", description: "Play Zingers from inside an AI agent via MCP tools." },
  // design
  { slug: "design", section: "design", order: 0, title: "Documentation index", file: "docs/README.md", description: "Map of technical design docs." },
  { slug: "design/vision", section: "design", order: 1, title: "Design vision", file: "docs/design-vision.md", description: "Flight-First north star: you fly, it fights, you both rise." },
  { slug: "design/vocabulary", section: "design", order: 2, title: "Vocabulary", file: "docs/vocabulary.md", description: "Naming policy: Trainer, Strategy, Clan, fight, Flight, standings." },
  { slug: "design/combat", section: "design", order: 3, title: "Combat design", file: "docs/combat-design.md", description: "Damage formula, First Mind movesets, judge rules; dex merges on top." },
  { slug: "design/game-spec", section: "design", order: 4, title: "Game spec", file: "docs/game-spec.md", description: "Product spine: Fly → Claim → Raise → Fight → Climb." },
  { slug: "design/flight-first", section: "design", order: 5, title: "Flight-First plan", file: "docs/flight-first-plan.md", description: "Roadmap: Flight door, wallet identity, launch gates." },
  { slug: "design/two-doors", section: "design", order: 6, title: "Two doors", file: "docs/two-doors.md", description: "Flight-first mobile face; desktop full world; measurement." },
  { slug: "design/essence", section: "design", order: 7, title: "Essence", file: "docs/essence.md", description: "One soul, native bodies across phone and desktop." },
  { slug: "design/long-game", section: "design", order: 8, title: "Long game", file: "docs/long-game.md", description: "Director, unlocks, wing traits, Conditions, expeditions, dex." },
  { slug: "design/first-journey", section: "design", order: 9, title: "First journey (historical)", file: "docs/first-journey-roadmap.md", description: "Prior fight-led Act 1. Superseded by Flight-First sequencing." },
  // product
  { slug: "product/onepager", section: "product", order: 0, title: "One-pager", file: "docs/ONEPAGER.md", description: "Elevator pitch." },
  { slug: "product/twopager", section: "product", order: 1, title: "Two-pager", file: "docs/TWOPAGER.md", description: "Extended pitch." },
  { slug: "product/story", section: "product", order: 2, title: "Story one-pager", file: "docs/STORY.md", description: "The concept: the Hum, champions, Forces, worlds, and seasons." },
  { slug: "product/technical", section: "product", order: 3, title: "Technical one-pager", file: "docs/TECHNICAL.md", description: "Stack, engine-vs-LLM, architecture, and performance." },
  { slug: "product/ai-crypto", section: "product", order: 4, title: "AI & crypto one-pager", file: "docs/AI-CRYPTO.md", description: "The agent layer and the $ZING / Crowns model." },
];
const PAGE_BY_SLUG = new Map(ORG_PAGES.map((p) => [p.slug, p]));

/** basename / full path → /org/... href */
export const ORG_FILE_HREF = new Map<string, string>();
for (const page of ORG_PAGES) {
  ORG_FILE_HREF.set(page.file, `/org/${page.slug}`);
  const base = page.file.split("/").pop()!;
  ORG_FILE_HREF.set(base, `/org/${page.slug}`);
}

export function getOrgPage(slug: string): OrgPage | undefined {
  return PAGE_BY_SLUG.get(slug);
}

export function orgPagesInSection(sectionId: string): OrgPage[] {
  return ORG_PAGES.filter((p) => p.section === sectionId).sort((a, b) => a.order - b.order);
}

export function allOrgSlugs(): string[] {
  return ORG_PAGES.map((p) => p.slug);
}
