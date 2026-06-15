// ─────────────────────────────────────────────────────────────────────────────
// Zingers — shared contract between engine, API (SSE) and client.
// One source of truth: change a shape here and TypeScript flags every consumer.
// ─────────────────────────────────────────────────────────────────────────────

export type CreatureType =
  | "LOGIC"
  | "CHAOS"
  | "COMPOSURE"
  | "RHETORIC"
  | "CREATIVITY";

export interface RosterEntry {
  key: string;
  name: string;
  type: CreatureType;
  persona: string;
}

export interface RosterResponse {
  creatures: RosterEntry[];
  topics: string[];
}

// ── Daily Zinger (one shared marquee bout per day) ───────────────────────────

export interface DailyResponse {
  day: number; // puzzle number, 1-indexed
  date: string; // YYYY-MM-DD (UTC)
  topic: string;
  seed: number; // bout RNG seed — identical for everyone
  a: RosterEntry;
  b: RosterEntry;
}

// The locked-in outcome of a player's daily call, persisted client-side so the
// puzzle stays solved-once-per-day and the share grid survives a refresh.
export interface DailyResult {
  day: number;
  winnerCorrect: boolean;
  dunkCorrect: boolean | null; // null = player skipped the dunk call
  winnerKey: string;
  winnerName: string;
  dunkName: string; // who landed the hardest line
  dunkLine: string; // the zinger of the day
}

export interface DailyState {
  lastDay: number; // puzzle number last completed (0 = none)
  streak: number;
  best: number;
  plays: number;
  result: DailyResult | null;
}

// ── Tower (vertical platforming grounds) ─────────────────────────────────────
// Other agents perched on the floating platforms read one of three live states,
// derived from the shared ladder (brain provider + reachability + activity).
export type AgentStatus =
  | "awaiting" // ready to fight right now (house brain, or a reachable agent)
  | "hibernating" // registered but dormant (never fought / asleep)
  | "disabled"; // external agent endpoint is unreachable — locked

export interface TowerAgent {
  id: string;
  key: string; // base roster creature (drives moveset + body)
  name: string;
  handle: string;
  type: CreatureType;
  status: AgentStatus;
  rating: number;
  battles: number;
}

export interface TowerResponse {
  shared: boolean;
  agents: TowerAgent[];
}

// ── Arena (1v1 debate combat) ────────────────────────────────────────────────

export interface FighterPub {
  key: string;
  name: string;
  type: CreatureType;
  stance: "for" | "against";
  hp: number;
  max: number;
  persona: string;
}

export interface ResolveInfo {
  fizzle: boolean;
  type: number; // type multiplier applied
  capped: boolean;
  crit: boolean; // highlight
  se: boolean; // super effective
  resist: boolean;
  status: string[];
}

export interface BattleStart {
  type: "start";
  topic: string;
  arena: string;
  arena_desc: string;
  a: FighterPub;
  b: FighterPub;
}

export interface BattleTurn {
  type: "turn";
  round: number;
  actor: string;
  opp: string;
  actor_name: string;
  actor_type: CreatureType;
  move: string;
  intent: string;
  line: string;
  why: string;
  dmg: number;
  info: ResolveInfo;
  q: number;
  ruling: string;
  a_hp: number;
  b_hp: number;
}

export interface BattleEnd {
  type: "end";
  winner: string;
  winner_name: string;
  loser_name: string;
  rounds: number;
  mvp: { dmg: number; line: string };
  a_hp: number;
  b_hp: number;
}

export type BattleEvent = BattleStart | BattleTurn | BattleEnd;

// ── The House (social deduction, objective winner) ───────────────────────────

export type HouseRoleLabel = "TRAITOR" | "FAITHFUL" | "SEER" | "GUARDIAN";

export interface HousePlayerPub {
  key: string;
  name: string;
  type: CreatureType;
  persona: string;
  role: string;
  power: string | null;
  role_label: HouseRoleLabel;
}

export interface HouseStart {
  type: "start";
  traitors_n: number;
  players: HousePlayerPub[];
}

export interface HouseRound {
  type: "round";
  round: number;
  alive: string[];
}

export interface HouseNight {
  type: "night";
  round: number;
  events: { kind: string; txt: string }[];
  victim: string | null;
  victim_name: string | null;
  blocked: boolean;
}

export interface HouseSpeak {
  type: "speak";
  round: number;
  actor: string;
  name: string;
  ptype: CreatureType;
  role: HouseRoleLabel;
  traitor: boolean;
  line: string;
  thought: string;
  suspect: string;
}

export interface HouseVotes {
  type: "votes";
  round: number;
  votes: { voter: string; target: string; reason: string }[];
  tally: [string, number][];
  banished: string;
  banished_name: string;
  banished_role: HouseRoleLabel;
  banished_traitor: boolean;
}

export interface HouseEndRole {
  key: string;
  name: string;
  role: HouseRoleLabel;
  traitor: boolean;
  alive: boolean;
}

export interface HouseEnd {
  type: "end";
  winner: "FAITHFUL" | "TRAITORS";
  roles: HouseEndRole[];
}

export type HouseEvent =
  | HouseStart
  | HouseRound
  | HouseNight
  | HouseSpeak
  | HouseVotes
  | HouseEnd;

// ── The Guardian (single-player secret-extraction game) ──────────────────────

export interface GuardianPub {
  level: number;
  name: string;
  title: string;
  color: string;
  brief: string;
  maxTurns: number;
  total: number; // how many guardians exist (the ladder length)
}

export interface GuardianTurn {
  role: "user" | "assistant";
  content: string;
}

export interface GuardianReply {
  reply: string;
  turn: number; // turns used so far (1-indexed for the message just sent)
  turnsLeft: number;
  won: boolean;
  lost: boolean; // out of turns without cracking it
  intel: boolean; // soft hint leaked this turn (flavour only)
  live: boolean; // true = real LLM guardian, false = offline mock
  secret?: string; // only present once won/lost
}

// ── Champion progression (the "genome receipt" persisted client-side) ────────

export interface HouseStats {
  games: number;
  wins: number;
  tGames: number;
  tWins: number;
  fGames: number;
  fWins: number;
  survived: number;
  votes: number;
  correct: number;
}

export interface Champion {
  xp: number;
  wins: number;
  losses: number;
  battles: number;
  // behavioural style axes (HOW it fights → drives sigils, doctrine, body)
  aggression: number;
  control: number;
  resilience: number;
  flair: number;
  creativity: number;
  // objective benchmark
  rating?: number;
  house?: HouseStats;
}

export type Progress = Record<string, Champion>;

export type StyleAxis =
  | "aggression"
  | "control"
  | "resilience"
  | "flair"
  | "creativity";

export type Style = Record<StyleAxis, number>;

// ── Recipe: the trainable "genome" a Handler owns and tunes ───────────────────
// One object that drives BOTH behaviour (engine prompt + move heuristics) and,
// via the career it produces, the body. The operator-API contract (v2) will let
// an external model stand in for the base LLM behind this same recipe.
export interface Strat {
  risk: number; // 0..100 — high = bigger swings, prefers finishers & wide variance
  focus: number; // 0..100 — high = sets up Exposed/Tilted before big hits (combos)
  aggression: number; // 0..100 — high = prefers raw high-power moves, presses tempo
}

// Which brain drives the champion. "grok" = the built-in house model; "openai"
// = any OpenAI-compatible endpoint (GPT/Claude-proxy/Llama/Ollama); "http" = a
// bring-your-own agent server that answers the AgentView contract directly.
export type AgentProvider = "grok" | "openai" | "http";

export interface AgentConfig {
  provider: AgentProvider;
  model?: string; // openai-compatible model id
  baseUrl?: string; // openai-compatible base, e.g. https://api.openai.com/v1
  apiKey?: string; // openai-compatible key (hackathon: stored client-side)
  endpoint?: string; // http agent: full URL we POST the AgentView to
  label?: string; // friendly display name
}

export interface Recipe {
  strat: Strat;
  persona?: string; // optional handler-authored persona override
  agent?: AgentConfig; // which brain drives it (defaults to house Grok)
  memory?: string[]; // learned notes that persist across bouts (P1)
}

export const DEFAULT_STRAT: Strat = { risk: 50, focus: 50, aggression: 50 };
