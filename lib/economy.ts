// Canonical economy — single source of truth for both the client mirror and the
// server-authoritative wallet. No "use client" / "server-only" so BOTH sides
// import the SAME numbers and the SAME event validation. Online-first: the server
// owns the balance; the client reflects what the server returns.

// Starting balance, materialised server-side on a wallet's first touch.
export const STARTING_CROWNS = 500;

// Crowns granted for winning a ranked Grounds duel. Decided server-side off the
// engine outcome (lib/server/ladder.ts) so the client can't invent it.
export const GROUNDS_WIN_REWARD = 40;

// Home advantage: a ranked win earned in a region aligned to the player's pledged
// Clan pays this many BONUS Crowns (on top of GROUNDS_WIN_REWARD) and counts
// double in the season war. The perk for committing to a Clan — purely
// economic/meta, so ranked ELO stays a fair fight. Decided server-side.
export const HOME_WIN_BONUS = 20;
export const HOME_WAR_WEIGHT = 2;

// Fixed sinks.
export const TRAIN_COST = 60;
export const FRAGMENT_BUY = 140; // Crowns → 1 fragment
export const FRAGMENT_SELL = 90; // 1 fragment → Crowns (Broker spread)

// Betting: only these stakes are legal; payout is 2× on a correct call.
export const BET_AMOUNTS = [25, 50, 100] as const;
export const MAX_BET = 100;
export const BET_PAYOUT_MULT = 2;

// Ceilings for variable, client-reported earns. The server clamps to these so a
// forged cache/goal/gauntlet payout can't mint unbounded Crowns.
export const CACHE_MAX = 200;
export const GOAL_MAX = 600;
export const GAUNTLET_MAX = 1200;

export function isLegalBet(stake: number): boolean {
  return (BET_AMOUNTS as readonly number[]).includes(stake);
}

// The server-authoritative wallet events. Fixed-amount events ignore any client
// amount; variable earns clamp the client amount to a ceiling. `bet_commit` is
// handled specially by the wallet route (it also writes a pending bet).
export type WalletEventType =
  | "train"
  | "fragment_buy"
  | "fragment_sell"
  | "cache"
  | "goal"
  | "gauntlet";

const clampPos = (n: unknown, max: number): number => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
};

// The signed Crown delta for an event — the ONLY place amounts are decided. A
// spend returns a negative delta; the route checks the balance can cover it.
export function walletDelta(type: WalletEventType, amount?: number): number | null {
  switch (type) {
    case "train":
      return -TRAIN_COST;
    case "fragment_buy":
      return -FRAGMENT_BUY;
    case "fragment_sell":
      return FRAGMENT_SELL;
    case "cache":
      return clampPos(amount, CACHE_MAX);
    case "goal":
      return clampPos(amount, GOAL_MAX);
    case "gauntlet":
      return clampPos(amount, GAUNTLET_MAX);
    default:
      return null;
  }
}
