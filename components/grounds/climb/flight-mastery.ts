// Post-run mastery lines for Flight — clean sky / caches / lives.
// Intentionally NOT time or flap-count: those skew desktop vs mobile craft.

export interface FlightRunMastery {
  stumbles: number;
  /** Crown caches collected this run (field name kept for board payloads). */
  goldRings: number;
  livesLeft: number;
  maxLives: number;
}

/** Compact mastery read for FULL CLEAR / run cards (both bodies). */
export function flightMasteryLine(m: FlightRunMastery): string {
  const stumbles = Math.max(0, Math.floor(m.stumbles));
  const caches = Math.max(0, Math.floor(m.goldRings));
  const lives = Math.max(0, Math.floor(m.livesLeft));
  const max = Math.max(1, Math.floor(m.maxLives));
  const parts: string[] = [];
  if (stumbles === 0) parts.push("Clean sky");
  else parts.push(`${stumbles} stumble${stumbles === 1 ? "" : "s"}`);
  if (caches > 0) parts.push(`${caches} cache${caches === 1 ? "" : "s"}`);
  parts.push(`${lives}/${max} lives`);
  return parts.join(" · ");
}

/** FULL CLEAR kicker body — summit story, not a speedrun pitch. */
export function hundredClearDetail(firstHundred: boolean): string {
  if (firstHundred) {
    return "You stood at the top of the sky. The Hundred is yours. Next: fly cleaner, race a friend, or wait for a new weekly sky.";
  }
  return "Summit again. Chase a cleaner Hundred, share a challenge, or fly this week's expedition.";
}
