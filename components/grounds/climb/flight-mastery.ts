// Post-run mastery lines for Flight — clean sky / gold / lives.
// Intentionally NOT time or flap-count: those skew desktop vs mobile craft.

export interface FlightRunMastery {
  stumbles: number;
  goldRings: number;
  livesLeft: number;
  maxLives: number;
}

/** Compact mastery read for FULL CLEAR / run cards (both bodies). */
export function flightMasteryLine(m: FlightRunMastery): string {
  const stumbles = Math.max(0, Math.floor(m.stumbles));
  const gold = Math.max(0, Math.floor(m.goldRings));
  const lives = Math.max(0, Math.floor(m.livesLeft));
  const max = Math.max(1, Math.floor(m.maxLives));
  const parts: string[] = [];
  if (stumbles === 0) parts.push("Clean sky");
  else parts.push(`${stumbles} stumble${stumbles === 1 ? "" : "s"}`);
  if (gold > 0) parts.push(`${gold} gold`);
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
