// Player-facing fight vocabulary — never "bout" in UI copy.
// Internal code/analytics may still say bout (useBout, event kind "bout"); players see fight / battle / duel.

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

/** Canonical Trainer vs champion teaching lines — use everywhere onboarding touches. */
export const READER_COPY = {
  claimLine: "You did not become this champion. You claimed them.",
  /** Prefer the named form once a champion is known. */
  walkFightLine: (name?: string) =>
    name
      ? `You fly the world. ${name} flies at your side.`
      : "You fly the world. Your champion flies at your side.",
  walkFightChip: (name?: string) =>
    name ? `You fly · ${name} flies with you` : "You fly · Your champion flies with you",
  flyLine: "Hold to rise. The world is yours to soar.",
  adoptCta: (name: string) => `Adopt ${name}`,
  wingmateChip: (name: string) => `Wingmate · ${name}`,
  rookieArc: "Everything you do together reshapes the body. This is day one.",
  legendAspiration: "Legend forms earn their shape. Yours starts at Rookie.",
  rookieEarned: "You claimed a rookie. The legend form is earned.",
} as const;
