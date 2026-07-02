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

/** Canonical Reader vs champion teaching lines — use everywhere onboarding touches. */
export const READER_COPY = {
  claimLine: "You did not become this champion. You claimed it.",
  walkFightLine: "You fly the Grounds. Your champion flies at your side.",
  walkFightChip: "You fly · It flies with you",
  flyLine: "Hold to rise. The Grounds are yours to soar.",
  adoptCta: (name: string) => `Adopt ${name}`,
  rookieArc: "Everything you do together reshapes the body. This is day one.",
  legendAspiration: "Legend forms earn their shape — yours starts at Rookie.",
  rookieEarned: "You claimed a rookie — the legend form is earned.",
} as const;
