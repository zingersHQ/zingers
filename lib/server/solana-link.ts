// Optional Solana wallet ↔ owner-token link (docs/flight-first-plan.md §Wallet).
// Identity only — no payments, no token balance, no spend approvals.
import "server-only";
import { Redis } from "@upstash/redis";
import { verifyAsync } from "@noble/ed25519";
import bs58 from "bs58";

const NONCE_TTL_SEC = 10 * 60;
const MSG_PREFIX = "Zingers Trainer sigil\n";

type LinkStore = {
  putNonce(token: string, nonce: string): Promise<void>;
  takeNonce(token: string): Promise<string | null>;
  getPubkey(token: string): Promise<string | null>;
  getToken(pubkey: string): Promise<string | null>;
  link(token: string, pubkey: string): Promise<void>;
  unlink(token: string): Promise<void>;
  shared: boolean;
};

function redis(): Redis | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

class RedisLinks implements LinkStore {
  shared = true;
  constructor(private r: Redis) {}
  async putNonce(token: string, nonce: string) {
    await this.r.set(`z:solnonce:${token}`, nonce, { ex: NONCE_TTL_SEC });
  }
  async takeNonce(token: string) {
    const k = `z:solnonce:${token}`;
    const n = await this.r.get<string>(k);
    if (n) await this.r.del(k);
    return n ?? null;
  }
  async getPubkey(token: string) {
    return (await this.r.get<string>(`z:soltok:${token}`)) ?? null;
  }
  async getToken(pubkey: string) {
    return (await this.r.get<string>(`z:solpk:${pubkey}`)) ?? null;
  }
  async link(token: string, pubkey: string) {
    const prev = await this.getPubkey(token);
    if (prev && prev !== pubkey) await this.r.del(`z:solpk:${prev}`);
    const other = await this.getToken(pubkey);
    if (other && other !== token) await this.r.del(`z:soltok:${other}`);
    await this.r.set(`z:soltok:${token}`, pubkey);
    await this.r.set(`z:solpk:${pubkey}`, token);
  }
  async unlink(token: string) {
    const pk = await this.getPubkey(token);
    await this.r.del(`z:soltok:${token}`);
    if (pk) await this.r.del(`z:solpk:${pk}`);
  }
}

class MemoryLinks implements LinkStore {
  shared = false;
  private nonces = new Map<string, { n: string; exp: number }>();
  private tok = new Map<string, string>();
  private pk = new Map<string, string>();
  async putNonce(token: string, nonce: string) {
    this.nonces.set(token, { n: nonce, exp: Date.now() + NONCE_TTL_SEC * 1000 });
  }
  async takeNonce(token: string) {
    const e = this.nonces.get(token);
    this.nonces.delete(token);
    if (!e || e.exp < Date.now()) return null;
    return e.n;
  }
  async getPubkey(token: string) {
    return this.tok.get(token) ?? null;
  }
  async getToken(pubkey: string) {
    return this.pk.get(pubkey) ?? null;
  }
  async link(token: string, pubkey: string) {
    const prev = this.tok.get(token);
    if (prev && prev !== pubkey) this.pk.delete(prev);
    const other = this.pk.get(pubkey);
    if (other && other !== token) this.tok.delete(other);
    this.tok.set(token, pubkey);
    this.pk.set(pubkey, token);
  }
  async unlink(token: string) {
    const pk = this.tok.get(token);
    this.tok.delete(token);
    if (pk) this.pk.delete(pk);
  }
}

let cached: LinkStore | null = null;

export function solanaLinks(): LinkStore {
  if (cached) return cached;
  const r = redis();
  cached = r ? new RedisLinks(r) : new MemoryLinks();
  return cached;
}

export function buildSignMessage(nonce: string): string {
  return `${MSG_PREFIX}Nonce: ${nonce}\nThis proves you control this wallet. It does not spend or approve anything.`;
}

export async function issueNonce(ownerToken: string): Promise<{ nonce: string; message: string }> {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  await solanaLinks().putNonce(ownerToken, nonce);
  return { nonce, message: buildSignMessage(nonce) };
}

function parsePubkey(pubkey: string): Uint8Array | null {
  try {
    const bytes = bs58.decode(pubkey.trim());
    return bytes.length === 32 ? bytes : null;
  } catch {
    return null;
  }
}

function parseSig(signature: string): Uint8Array | null {
  try {
    // Phantom signMessage returns base58 or uint8 array serialized as base58
    const bytes = bs58.decode(signature.trim());
    return bytes.length === 64 ? bytes : null;
  } catch {
    return null;
  }
}

export async function verifyAndLink(opts: {
  ownerToken: string;
  pubkey: string;
  signature: string;
  message: string;
}): Promise<{ ok: true; pubkey: string } | { ok: false; error: string }> {
  const store = solanaLinks();
  const nonce = await store.takeNonce(opts.ownerToken);
  if (!nonce) return { ok: false, error: "Nonce expired — try again." };

  const expected = buildSignMessage(nonce);
  if (opts.message !== expected) return { ok: false, error: "Message mismatch." };

  const pk = parsePubkey(opts.pubkey);
  const sig = parseSig(opts.signature);
  if (!pk || !sig) return { ok: false, error: "Invalid pubkey or signature." };

  const msgBytes = new TextEncoder().encode(opts.message);
  const valid = await verifyAsync(sig, msgBytes, pk);
  if (!valid) return { ok: false, error: "Signature invalid." };

  const pubkey = opts.pubkey.trim();
  await store.link(opts.ownerToken, pubkey);
  return { ok: true, pubkey };
}

export async function linkedPubkey(ownerToken: string): Promise<string | null> {
  return solanaLinks().getPubkey(ownerToken);
}

export async function unlinkWallet(ownerToken: string): Promise<void> {
  await solanaLinks().unlink(ownerToken);
}
