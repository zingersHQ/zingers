// Feature flags. Client-safe (read from NEXT_PUBLIC_* so both server and browser
// see the same value). Default OFF — a flag ships dark and is validated before it
// gates live behaviour.

// Promotion Trials: when on, crossing a tier no longer auto-grants the new tier's
// heraldry — the champion must WIN a nominated trial duel first (see WS7). Off →
// tier-ups apply immediately, exactly as before.
export const TRIALS = process.env.NEXT_PUBLIC_TRIALS === "1";
