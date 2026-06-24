// Player-facing fight vocabulary — one word for the product UI.
// Internal code/analytics may still say "bout"; players see "duel" / "fight".

export const FIGHT = {
  /** noun: "your first duel", "watch the duel" */
  duel: "duel",
  /** verb: "watch it fight" */
  fight: "fight",
  /** third person: "how it fights" */
  fights: "fights",
  /** plural */
  duels: "duels",
  /** ranked / league context */
  rankedDuel: "ranked duel",
  /** league / autonomous fights */
  leagueDuels: "league duels",
  /** gauntlet streak */
  consecutiveDuels: "consecutive duels",
  /** first-journey CTA */
  firstDuel: "first duel",
} as const;
