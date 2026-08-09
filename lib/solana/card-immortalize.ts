// Shared constants + voucher message layout for card_immortalize program.
// Must match onchain/card_immortalize/programs/card_immortalize/src/lib.rs

export const CARD_IMMORTALIZE_PROGRAM_ID = "FNjvsSSqg8VcEuvRpXT1BjGWFe2BWwiQHo6qjoSUme3U";
export const VOUCHER_PREFIX = "card_immortalize_v1";

export function programId(): string {
  return process.env.CARD_IMMORTALIZE_PROGRAM_ID?.trim() || CARD_IMMORTALIZE_PROGRAM_ID;
}

/** sha256(utf8(mindKey)) — mindKey should already be uppercase. */
export async function mindHash(mindKey: string): Promise<Uint8Array> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(mindKey.trim().toUpperCase(), "utf8").digest();
}

/** sha256(name || "\\0" || uri) — bound into the voucher / career stamp. */
export async function metaHash(name: string, uri: string): Promise<Uint8Array> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(`${name}\0${uri}`, "utf8").digest();
}

export function buildVoucherMessage(opts: {
  owner: Uint8Array; // 32
  mindHash: Uint8Array; // 32
  burnAmount: bigint;
  mintIndex: number;
  year: number;
  genesis: number;
  exp: bigint;
  nonce: Uint8Array; // 16
  metaHash: Uint8Array; // 32
}): Uint8Array {
  const parts: Buffer[] = [
    Buffer.from(VOUCHER_PREFIX, "utf8"),
    Buffer.from(opts.owner),
    Buffer.from(opts.mindHash),
    Buffer.alloc(8),
    Buffer.alloc(2),
    Buffer.alloc(4),
    Buffer.from([opts.genesis & 0xff]),
    Buffer.alloc(8),
    Buffer.from(opts.nonce),
    Buffer.from(opts.metaHash),
  ];
  parts[3].writeBigUInt64LE(opts.burnAmount);
  parts[4].writeUInt16LE(opts.mintIndex);
  parts[5].writeUInt32LE(opts.year);
  parts[7].writeBigInt64LE(opts.exp);
  return Buffer.concat(parts);
}
