// Schema for Stage 6 batch minds (docs/long-game.md).
// Reviewed JSON in content/minds/reviewed/ bakes into lib/minds/baked.ts.
import type { CreatureType } from "@/lib/types";
import type { Creature, Move, StatKey } from "@/lib/engine/roster";

export type StyleAxis = "aggression" | "control" | "resilience" | "flair" | "creativity";

export interface MindBeats {
  wake: string;
  imprintAsk: string;
  flightReact: [string, string];
  greeting: { train: string; return: string; arena: string };
  homecoming: { away: string; hot: string; cold: string };
  afterFight: { win: string; loss: string };
  imprintAck: string;
  rankedFinale: string;
}

export interface MindDraft {
  /** UPPERCASE roster key. */
  key: string;
  name: string;
  type: CreatureType;
  persona: string;
  /** Optional lineage gloss for cards. */
  lineage?: string;
  stats: Record<StatKey, number>;
  moves: Move[];
  beats: MindBeats;
  /** Three bars per move id. */
  banter: Record<string, [string, string, string]>;
  firstDuel?: { hook: string; originAxis?: StyleAxis };
  showcase?: {
    aggression: number;
    control: number;
    resilience: number;
    flair: number;
    creativity: number;
    wins: number;
    losses: number;
    battles: number;
  };
}

export type { Creature };
