// Optional wallet ↔ owner-token link (docs/flight-first-plan.md §Wallet).
// Identity only — no payments, no token balance, no spend approvals.
// A Trainer name can ride with the linked pubkey so reconnecting restores it.
// Names are globally unique (case-insensitive) once claimed to a pubkey.
import "server-only";
import { Redis } from "@upstash/redis";
import { verifyAsync } from "@noble/ed25519";
import bs58 from "bs58";
import { shortOwnerLabel, shortPubkey, trainerNameKey } from "@/lib/trainer-label";

const NONCE_TTL_SEC = 10 * 60;
const MSG_PREFIX = "Zingers\n";

export function cleanTrainerName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const t = raw.trim().replace(/\s+/g, " ").slice(0, 24);
  if (t.length < 2) return "";
  // Letters, numbers, spaces, light punctuation — no URLs / spam glyphs.
  if (!/^[\p{L}\p{N} _.\-']+$/u.test(t)) return "";
  return t;
}

export type NameStatus = "free" | "yours" | "taken" | "invalid";

type LinkStore = {
  putNonce(token: string, nonce: string): Promise<void>;
  takeNonce(token: string): Promise<string | null>;
  getPubkey(token: string): Promise<string | null>;
  getToken(pubkey: string): Promise<string | null>;
  link(token: string, pubkey: string): Promise<void>;
  unlink(token: string): Promise<void>;
  getName(pubkey: string): Promise<string | null>;
  setName(pubkey: string, name: string): Promise<void>;
  getClaim(nameKey: string): Promise<string | null>;
  /** Atomically claim a name key for pubkey. Returns false if held by another. */
  tryClaim(nameKey: string, pubkey: string): Promise<boolean>;
  releaseClaim(nameKey: string, pubkey: string): Promise<void>;
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
    // Keep z:solname + z:solclaim — name follows the key, not the device token.
  }
  async getName(pubkey: string) {
    return (await this.r.get<string>(`z:solname:${pubkey}`)) ?? null;
  }
  async setName(pubkey: string, name: string) {
    if (!name) {
      await this.r.del(`z:solname:${pubkey}`);
      return;
    }
    await this.r.set(`z:solname:${pubkey}`, name);
  }
  async getClaim(nameKey: string) {
    return (await this.r.get<string>(`z:solclaim:${nameKey}`)) ?? null;
  }
  async tryClaim(nameKey: string, pubkey: string) {
    const owner = await this.getClaim(nameKey);
    if (owner === pubkey) return true;
    if (owner) return false;
    // Upstash: SET NX returns "OK" | null
    const ok = await this.r.set(`z:solclaim:${nameKey}`, pubkey, { nx: true });
    return ok === "OK";
  }
  async releaseClaim(nameKey: string, pubkey: string) {
    const owner = await this.getClaim(nameKey);
    if (owner === pubkey) await this.r.del(`z:solclaim:${nameKey}`);
  }
}

class MemoryLinks implements LinkStore {
  shared = false;
  private nonces = new Map<string, { n: string; exp: number }>();
  private tok = new Map<string, string>();
  private pk = new Map<string, string>();
  private names = new Map<string, string>();
  private claims = new Map<string, string>();
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
  async getName(pubkey: string) {
    return this.names.get(pubkey) ?? null;
  }
  async setName(pubkey: string, name: string) {
    if (!name) this.names.delete(pubkey);
    else this.names.set(pubkey, name);
  }
  async getClaim(nameKey: string) {
    return this.claims.get(nameKey) ?? null;
  }
  async tryClaim(nameKey: string, pubkey: string) {
    const owner = this.claims.get(nameKey);
    if (owner === pubkey) return true;
    if (owner) return false;
    this.claims.set(nameKey, pubkey);
    return true;
  }
  async releaseClaim(nameKey: string, pubkey: string) {
    if (this.claims.get(nameKey) === pubkey) this.claims.delete(nameKey);
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
  return `${MSG_PREFIX}Nonce: ${nonce}\nConfirm this Trainer on this device. Nothing is spent.`;
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
    const bytes = bs58.decode(signature.trim());
    return bytes.length === 64 ? bytes : null;
  } catch {
    return null;
  }
}

/** Ensure a legacy solname (pre-registry) holds its claim key if free. */
async function ensureLegacyClaim(store: LinkStore, pubkey: string, name: string): Promise<void> {
  const key = trainerNameKey(name);
  if (!key) return;
  const owner = await store.getClaim(key);
  if (!owner) await store.tryClaim(key, pubkey);
}

/**
 * Claim a unique Trainer name for a linked pubkey.
 * Releases the previous claim for this key when renaming.
 */
export async function claimNameForPubkey(
  pubkey: string,
  rawName: string,
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const store = solanaLinks();
  const name = cleanTrainerName(rawName);
  if (!name) return { ok: false, error: "Name needs 2–24 ordinary characters." };
  const key = trainerNameKey(name);

  const prev = await store.getName(pubkey);
  if (prev) await ensureLegacyClaim(store, pubkey, prev);

  const taken = await store.getClaim(key);
  if (taken && taken !== pubkey) return { ok: false, error: "Name taken." };

  const claimed = await store.tryClaim(key, pubkey);
  if (!claimed) return { ok: false, error: "Name taken." };

  if (prev) {
    const prevKey = trainerNameKey(prev);
    if (prevKey && prevKey !== key) await store.releaseClaim(prevKey, pubkey);
  }
  await store.setName(pubkey, name);
  return { ok: true, name };
}

export async function checkTrainerName(rawName: string, ownerToken?: string): Promise<{ status: NameStatus; name: string }> {
  const name = cleanTrainerName(rawName);
  if (!name) return { status: "invalid", name: "" };
  const store = solanaLinks();
  const key = trainerNameKey(name);
  const owner = await store.getClaim(key);
  if (!owner) {
    // Legacy: someone has this display string but never wrote a claim — treat as taken if any pubkey holds it.
    // We only know via reverse lookup when checking against the caller's own name.
    if (ownerToken) {
      const pk = await store.getPubkey(ownerToken);
      if (pk) {
        const mine = await store.getName(pk);
        if (mine && trainerNameKey(mine) === key) return { status: "yours", name: mine };
      }
    }
    return { status: "free", name };
  }
  if (ownerToken) {
    const pk = await store.getPubkey(ownerToken);
    if (pk && pk === owner) return { status: "yours", name };
  }
  return { status: "taken", name };
}

/** Server-authoritative board / HUD label for an owner token. */
export async function resolveTrainerLabel(ownerToken: string): Promise<string> {
  const store = solanaLinks();
  const pubkey = await store.getPubkey(ownerToken);
  if (!pubkey) return shortOwnerLabel(ownerToken);
  const name = await store.getName(pubkey);
  if (name) {
    await ensureLegacyClaim(store, pubkey, name);
    return name;
  }
  return shortPubkey(pubkey);
}

export async function verifyAndLink(opts: {
  ownerToken: string;
  pubkey: string;
  signature: string;
  message: string;
  name?: string;
}): Promise<
  | {
      ok: true;
      pubkey: string;
      name: string | null;
      nameError?: string;
      /** Career key bound to this pubkey — adopt on the client when restored. */
      ownerToken: string;
      restored: boolean;
    }
  | { ok: false; error: string }
> {
  const store = solanaLinks();
  const nonce = await store.takeNonce(opts.ownerToken);
  if (!nonce) return { ok: false, error: "Session expired — try again." };

  const expected = buildSignMessage(nonce);
  if (opts.message !== expected) return { ok: false, error: "Message mismatch." };

  const pk = parsePubkey(opts.pubkey);
  const sig = parseSig(opts.signature);
  if (!pk || !sig) return { ok: false, error: "Invalid key or signature." };

  const msgBytes = new TextEncoder().encode(opts.message);
  const valid = await verifyAsync(sig, msgBytes, pk);
  if (!valid) return { ok: false, error: "Signature invalid." };

  const pubkey = opts.pubkey.trim();
  // First link wins: reconnect returns the canonical career token instead of
  // remapping the pubkey onto a fresh device token (which orphaned saves).
  const existing = await store.getToken(pubkey);
  const restored = !!(existing && existing !== opts.ownerToken);
  const ownerToken = restored && existing ? existing : opts.ownerToken;
  if (!restored) await store.link(opts.ownerToken, pubkey);

  let nameError: string | undefined;
  const incoming = cleanTrainerName(opts.name);
  if (incoming) {
    const claimed = await claimNameForPubkey(pubkey, incoming);
    if (!claimed.ok) nameError = claimed.error;
  }

  const name = (await store.getName(pubkey)) || null;
  return { ok: true, pubkey, name, nameError, ownerToken, restored };
}

export async function linkedIdentity(ownerToken: string): Promise<{ pubkey: string | null; name: string | null }> {
  const store = solanaLinks();
  const pubkey = await store.getPubkey(ownerToken);
  if (!pubkey) return { pubkey: null, name: null };
  const name = await store.getName(pubkey);
  if (name) await ensureLegacyClaim(store, pubkey, name);
  return { pubkey, name };
}

/** Persist a unique Trainer name onto the linked key. Requires an active link. */
export async function setLinkedName(
  ownerToken: string,
  rawName: string,
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const store = solanaLinks();
  const pubkey = await store.getPubkey(ownerToken);
  if (!pubkey) return { ok: false, error: "Connect first to lock a name." };
  return claimNameForPubkey(pubkey, rawName);
}

export async function linkedPubkey(ownerToken: string): Promise<string | null> {
  return solanaLinks().getPubkey(ownerToken);
}

export async function unlinkWallet(ownerToken: string): Promise<void> {
  await solanaLinks().unlink(ownerToken);
}
