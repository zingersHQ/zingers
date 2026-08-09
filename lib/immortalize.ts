// Immortalize — burn $ZING → stamp one on-chain (or attested) card.
// Pure rules shared by client + server. Game authority lives in lib/server/immortalize.ts.
// Canon: docs/zing-model.md

import type { Rarity } from "@/lib/lore/canon";

/** Year-1 law: at most M Immortal stamps per mind. Locked. */
export const IMMORTALS_PER_MIND_Y1 = 8;

/** Working burn table (display units of $ZING). Retune by config; no oracle. */
export const BURN_ZING_BY_RARITY: Readonly<Record<Rarity, number>> = {
  common: 100,
  uncommon: 250,
  rare: 500,
  epic: 1_000,
  legendary: 2_500,
  mythic: 5_000,
};

export type ImmortalizeMode = "off" | "attested" | "chain";

export interface ImmortalSnapshot {
  name: string;
  rarity: Rarity;
  level: number;
  tier: string;
  wins: number;
  losses: number;
  battles: number;
  /** Compact art fingerprint — appearance seed / hash string. */
  artHash: string;
}

export interface ImmortalRecord {
  mintId: string;
  mindKey: string;
  ownerToken: string;
  ownerPubkey: string;
  supplyYear: number;
  mintIndex: number; // 1..M within mind+year
  genesis: boolean;
  burnAmount: number;
  season: number;
  mintedAt: number;
  chain: string;
  /** Present when a real Solana tx sealed the stamp. */
  txSig: string | null;
  snapshot: ImmortalSnapshot;
}

export interface ImmortalVoucher {
  id: string;
  mindKey: string;
  ownerToken: string;
  ownerPubkey: string;
  supplyYear: number;
  mintIndex: number;
  genesis: boolean;
  burnAmount: number;
  rarity: Rarity;
  artHash: string;
  season: number;
  /** HMAC over canonical fields — program / confirm will verify. */
  sig: string;
  exp: number;
}

/** Machine reason codes — UI maps via messages/immortalize.* */
export type ImmortalReason =
  | "off"
  | "unknown_mind"
  | "no_wallet"
  | "not_owner"
  | "already"
  | "full"
  | null;

export interface ImmortalStatus {
  mode: ImmortalizeMode;
  mindKey: string;
  eligible: boolean;
  reason: ImmortalReason;
  reasonDetail: string | null;
  walletLinked: boolean;
  ownsCareer: boolean;
  alreadyImmortal: boolean;
  mindMinted: number;
  mindCap: number;
  burnAmount: number;
  rarity: Rarity;
  genesis: boolean;
  season: number;
  supplyYear: number;
  record: ImmortalRecord | null;
  /** Fuel SPL mint (CARS test lane or later $ZING). */
  fuelMint: string | null;
  fuelSymbol: string;
  /** True when on-chain program + voucher issuer are configured. */
  chainReady: boolean;
  /** card_immortalize program id (when chain). */
  programId: string | null;
}

export function burnAmountForRarity(rarity: Rarity): number {
  return BURN_ZING_BY_RARITY[rarity] ?? BURN_ZING_BY_RARITY.common;
}

/** Genesis / OG window: Season 0 proving week (and anything before S1). */
export function isGenesisSeason(season: number): boolean {
  return season <= 0;
}

export function immortalsCapForYear(supplyYear: number): number {
  // Year 1 locked at 8. Later years retune via env on the server; default keep 8.
  void supplyYear;
  return IMMORTALS_PER_MIND_Y1;
}

/** Canonical message the wallet signs to seal an attested Immortal. */
export function buildImmortalizeMessage(v: Pick<ImmortalVoucher, "id" | "mindKey" | "burnAmount" | "mintIndex" | "genesis">): string {
  return [
    "Zingers",
    "Immortalize",
    `voucher:${v.id}`,
    `mind:${v.mindKey}`,
    `burn:${v.burnAmount}`,
    `index:${v.mintIndex}`,
    `genesis:${v.genesis ? "1" : "0"}`,
    "Burn commits this career as an Immortal card. Crowns are never spent.",
  ].join("\n");
}
