// Shared Trainer display helpers (safe for client + server).
// Board labels prefer claimed name → short wallet → short token.

export function shortPubkey(pk: string): string {
  const t = pk.trim();
  if (t.length <= 10) return t;
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

/** Anonymous board fallback from an owner token (never show the full token). */
export function shortOwnerLabel(token: string): string {
  const t = token.trim();
  if (t.length >= 4) return `T-${t.slice(0, 4)}`;
  return "anon";
}

/** Case-fold key for unique Trainer name claims. */
export function trainerNameKey(name: string): string {
  return name.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}
