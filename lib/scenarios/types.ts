// A scenario is the GAME played in a world — its ruleset, objective and reward
// curve — independent of the biome (the skin). Two worlds can share a skin and
// play completely different games; this is what makes "switch world" mean
// something instead of just swapping colours.

export type ScenarioId = "duel" | "gauntlet";

export interface GauntletConfig {
  maxRounds: number; // how many opponents the chain can hold
  baseReward: number; // crowns banked for clearing round 1
  rewardGrowth: number; // multiplier applied per cleared round
  clearBonus: number; // fraction of the pot added for clearing the whole chain
  consolationFrac: number; // fraction of the banked pot kept after a loss
}

export interface ScenarioDef {
  id: ScenarioId;
  name: string;
  // one line describing the GAME — shown in the world selector
  blurb: string;
  // the win condition — shown in the HUD / briefing
  objective: string;
  // present iff id === "gauntlet"
  gauntlet?: GauntletConfig;
}
