// Server authority for Immortalize: eligibility, vouchers, supply counters, provenance.
// Attested mode seals with a wallet signature (pre-program). Chain mode expects a txSig.
import "server-only";
import { createHmac, randomUUID } from "crypto";
import { Redis } from "@upstash/redis";
import { verifyAsync } from "@noble/ed25519";
import bs58 from "bs58";
import { appearanceOf } from "@/lib/evolve/appearance";
import { blank, levelFor, tierFor } from "@/lib/evolve/progression";
import { rarityOf } from "@/lib/cards/card";
import type { Rarity } from "@/lib/lore/canon";
import { currentSeasonNumber } from "@/lib/lore/season";
import { ROSTER } from "@/lib/engine/roster";
import type { Champion } from "@/lib/types";
import { linkedPubkey } from "@/lib/server/solana-link";
import { getStore } from "@/lib/server/store";
import {
  type ImmortalRecord,
  type ImmortalSnapshot,
  type ImmortalStatus,
  type ImmortalVoucher,
  type ImmortalReason,
  type ImmortalizeMode,
  buildImmortalizeMessage,
  burnAmountForRarity,
  immortalsCapForYear,
  isGenesisSeason,
} from "@/lib/immortalize";
import {
  buildCarsImmortalizeTx,
  carsChainConfigured,
  getPendingByVoucher,
  verifyCarsImmortalizeTx,
} from "@/lib/server/cars-chain";
import { carsMintAddress, fuelSymbol } from "@/lib/server/solana-env";
import { programId as cardProgramId } from "@/lib/solana/card-immortalize";

const VOUCHER_TTL_SEC = 10 * 60;

function redis(): Redis | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function voucherSecret(): string {
  return (
    process.env.IMMORTALIZE_SECRET ||
    process.env.CRON_SECRET ||
    "dev-immortalize-secret-not-for-prod"
  );
}

export function immortalizeMode(): ImmortalizeMode {
  const raw = (process.env.IMMORTALIZE_MODE || "attested").trim().toLowerCase();
  if (raw === "off" || raw === "0" || raw === "false") return "off";
  if (raw === "chain") return "chain";
  return "attested";
}

export function supplyYear(now = Date.now()): number {
  const env = Number(process.env.IMMORTALIZE_SUPPLY_YEAR);
  if (Number.isFinite(env) && env >= 1) return Math.floor(env);
  // Chronicle Year 1 until 2027-01-01 UTC, then Year 2 (retune when M changes).
  return now < Date.UTC(2027, 0, 1) ? 1 : 2;
}

function countKey(year: number, mind: string) {
  return `z:imm:count:${year}:${mind}`;
}
function careerKey(token: string, mind: string) {
  return `z:imm:career:${token}:${mind}`;
}
function voucherKey(id: string) {
  return `z:imm:voucher:${id}`;
}
function byIdKey(mintId: string) {
  return `z:imm:byid:${mintId}`;
}

type ImmStore = {
  getCount(year: number, mind: string): Promise<number>;
  incrCount(year: number, mind: string): Promise<number>;
  decrCount(year: number, mind: string): Promise<void>;
  getCareer(token: string, mind: string): Promise<ImmortalRecord | null>;
  putCareerNx(rec: ImmortalRecord): Promise<boolean>;
  putVoucher(v: ImmortalVoucher): Promise<void>;
  peekVoucher(id: string): Promise<ImmortalVoucher | null>;
  takeVoucher(id: string): Promise<ImmortalVoucher | null>;
  getById(mintId: string): Promise<ImmortalRecord | null>;
  putById(rec: ImmortalRecord): Promise<void>;
  shared: boolean;
};

class RedisImm implements ImmStore {
  shared = true;
  constructor(private r: Redis) {}
  async getCount(year: number, mind: string) {
    const n = await this.r.get<number>(countKey(year, mind));
    return typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  async incrCount(year: number, mind: string) {
    return await this.r.incr(countKey(year, mind));
  }
  async decrCount(year: number, mind: string) {
    const n = await this.r.decr(countKey(year, mind));
    if (n < 0) await this.r.set(countKey(year, mind), 0);
  }
  async getCareer(token: string, mind: string) {
    return (await this.r.get<ImmortalRecord>(careerKey(token, mind))) ?? null;
  }
  async putCareerNx(rec: ImmortalRecord) {
    const ok = await this.r.set(careerKey(rec.ownerToken, rec.mindKey), rec, { nx: true });
    return ok === "OK";
  }
  async putVoucher(v: ImmortalVoucher) {
    await this.r.set(voucherKey(v.id), v, { ex: VOUCHER_TTL_SEC });
  }
  async peekVoucher(id: string) {
    return (await this.r.get<ImmortalVoucher>(voucherKey(id))) ?? null;
  }
  async takeVoucher(id: string) {
    const k = voucherKey(id);
    const v = await this.r.get<ImmortalVoucher>(k);
    if (v) await this.r.del(k);
    return v ?? null;
  }
  async getById(mintId: string) {
    return (await this.r.get<ImmortalRecord>(byIdKey(mintId))) ?? null;
  }
  async putById(rec: ImmortalRecord) {
    await this.r.set(byIdKey(rec.mintId), rec);
  }
}

class MemoryImm implements ImmStore {
  shared = false;
  private counts = new Map<string, number>();
  private careers = new Map<string, ImmortalRecord>();
  private vouchers = new Map<string, { v: ImmortalVoucher; exp: number }>();
  private byId = new Map<string, ImmortalRecord>();
  async getCount(year: number, mind: string) {
    return this.counts.get(countKey(year, mind)) ?? 0;
  }
  async incrCount(year: number, mind: string) {
    const k = countKey(year, mind);
    const n = (this.counts.get(k) ?? 0) + 1;
    this.counts.set(k, n);
    return n;
  }
  async decrCount(year: number, mind: string) {
    const k = countKey(year, mind);
    this.counts.set(k, Math.max(0, (this.counts.get(k) ?? 0) - 1));
  }
  async getCareer(token: string, mind: string) {
    return this.careers.get(careerKey(token, mind)) ?? null;
  }
  async putCareerNx(rec: ImmortalRecord) {
    const k = careerKey(rec.ownerToken, rec.mindKey);
    if (this.careers.has(k)) return false;
    this.careers.set(k, rec);
    return true;
  }
  async putVoucher(v: ImmortalVoucher) {
    this.vouchers.set(v.id, { v, exp: Date.now() + VOUCHER_TTL_SEC * 1000 });
  }
  async peekVoucher(id: string) {
    const e = this.vouchers.get(id);
    if (!e || e.exp < Date.now()) return null;
    return e.v;
  }
  async takeVoucher(id: string) {
    const e = this.vouchers.get(id);
    this.vouchers.delete(id);
    if (!e || e.exp < Date.now()) return null;
    return e.v;
  }
  async getById(mintId: string) {
    return this.byId.get(mintId) ?? null;
  }
  async putById(rec: ImmortalRecord) {
    this.byId.set(rec.mintId, rec);
  }
}

let cached: ImmStore | null = null;

function immStore(): ImmStore {
  if (cached) return cached;
  const r = redis();
  cached = r ? new RedisImm(r) : new MemoryImm();
  return cached;
}

function signVoucherFields(parts: string[]): string {
  return createHmac("sha256", voucherSecret()).update(parts.join("|")).digest("hex");
}

function artHashOf(champion: Champion): string {
  const a = appearanceOf(champion);
  // Stable short fingerprint from the body params the card already uses.
  const raw = JSON.stringify({
    h: a.h,
    w: a.width,
    hs: a.headScale,
    t: a.tier.name,
    m: a.morph,
    e: a.emissive,
  });
  return createHmac("sha256", "art").update(raw).digest("hex").slice(0, 24);
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

async function verifyWalletSig(pubkey: string, message: string, signature: string): Promise<boolean> {
  const pk = parsePubkey(pubkey);
  const sig = parseSig(signature);
  if (!pk || !sig) return false;
  return verifyAsync(sig, new TextEncoder().encode(message), pk);
}

async function ownsCareer(ownerToken: string, mindKey: string): Promise<boolean> {
  const store = getStore();
  const roster = await store.getRoster(ownerToken);
  if (roster.includes(mindKey)) return true;
  const save = await store.getSave(ownerToken);
  if (!save) return false;
  if (save.owned === mindKey) return true;
  if (Array.isArray(save.roster) && save.roster.includes(mindKey)) return true;
  if (save.progress && mindKey in save.progress) return true;
  return false;
}

function snapshotOf(mindKey: string, champion: Champion): ImmortalSnapshot {
  const c = champion || blank();
  const lf = levelFor(c.xp);
  const tier = tierFor(lf.level);
  const rarity = rarityOf(lf.level) as Rarity;
  const name = ROSTER[mindKey]?.name ?? mindKey;
  return {
    name,
    rarity,
    level: lf.level,
    tier: tier.name,
    wins: c.wins,
    losses: c.losses,
    battles: c.battles,
    artHash: artHashOf(c),
  };
}

async function loadSnapshot(ownerToken: string, mindKey: string): Promise<ImmortalSnapshot> {
  const save = await getStore().getSave(ownerToken);
  const c = (save?.progress?.[mindKey] as Champion | undefined) ?? blank();
  return snapshotOf(mindKey, c);
}

function reasonFor(opts: {
  mode: ImmortalizeMode;
  wallet: string | null;
  owns: boolean;
  already: boolean;
  mindMinted: number;
  cap: number;
  inRoster: boolean;
}): ImmortalReason {
  if (opts.mode === "off") return "off";
  if (!opts.inRoster) return "unknown_mind";
  if (!opts.wallet) return "no_wallet";
  if (!opts.owns) return "not_owner";
  if (opts.already) return "already";
  if (opts.mindMinted >= opts.cap) return "full";
  return null;
}

export async function immortalStatus(ownerToken: string, mindKeyRaw: string): Promise<ImmortalStatus> {
  const mindKey = mindKeyRaw.trim().toUpperCase();
  const mode = immortalizeMode();
  const year = supplyYear();
  const season = currentSeasonNumber();
  const cap = immortalsCapForYear(year);
  const store = immStore();
  const wallet = await linkedPubkey(ownerToken);
  const inRoster = !!ROSTER[mindKey];
  const owns = inRoster ? await ownsCareer(ownerToken, mindKey) : false;
  const record = await store.getCareer(ownerToken, mindKey);
  const mindMinted = await store.getCount(year, mindKey);
  const snap = inRoster ? await loadSnapshot(ownerToken, mindKey) : null;
  const rarity = snap?.rarity ?? ("common" as Rarity);
  const burnAmount = burnAmountForRarity(rarity);
  const genesis = isGenesisSeason(season);
  const reason = reasonFor({
    mode,
    wallet,
    owns,
    already: !!record,
    mindMinted,
    cap,
    inRoster,
  });

  return {
    mode,
    mindKey,
    eligible: !reason && mode !== "off",
    reason,
    reasonDetail: null,
    walletLinked: !!wallet,
    ownsCareer: owns,
    alreadyImmortal: !!record,
    mindMinted,
    mindCap: cap,
    burnAmount,
    rarity,
    genesis,
    season,
    supplyYear: year,
    record,
    fuelMint: carsMintAddress(),
    fuelSymbol: fuelSymbol(),
    chainReady: carsChainConfigured(),
    programId: cardProgramId(),
  };
}

export async function issueImmortalVoucher(
  ownerToken: string,
  mindKeyRaw: string,
): Promise<{ ok: true; voucher: ImmortalVoucher; message: string } | { ok: false; error: string }> {
  const status = await immortalStatus(ownerToken, mindKeyRaw);
  if (!status.eligible || status.reason) {
    return { ok: false, error: status.reason || "not_eligible" };
  }
  const wallet = await linkedPubkey(ownerToken);
  if (!wallet) return { ok: false, error: "no_wallet" };

  const snap = await loadSnapshot(ownerToken, status.mindKey);
  const mintIndex = status.mindMinted + 1;
  const id = randomUUID().replace(/-/g, "");
  const exp = Date.now() + VOUCHER_TTL_SEC * 1000;
  const sig = signVoucherFields([
    id,
    status.mindKey,
    ownerToken,
    wallet,
    String(status.supplyYear),
    String(mintIndex),
    status.genesis ? "1" : "0",
    String(status.burnAmount),
    snap.artHash,
    String(exp),
  ]);

  const voucher: ImmortalVoucher = {
    id,
    mindKey: status.mindKey,
    ownerToken,
    ownerPubkey: wallet,
    supplyYear: status.supplyYear,
    mintIndex,
    genesis: status.genesis,
    burnAmount: status.burnAmount,
    rarity: snap.rarity,
    artHash: snap.artHash,
    season: status.season,
    sig,
    exp,
  };

  await immStore().putVoucher(voucher);
  return { ok: true, voucher, message: buildImmortalizeMessage(voucher) };
}

function verifyVoucherHmac(v: ImmortalVoucher): boolean {
  const expect = signVoucherFields([
    v.id,
    v.mindKey,
    v.ownerToken,
    v.ownerPubkey,
    String(v.supplyYear),
    String(v.mintIndex),
    v.genesis ? "1" : "0",
    String(v.burnAmount),
    v.artHash,
    String(v.exp),
  ]);
  return expect === v.sig && v.exp > Date.now();
}

function mintIdFor(
  rec: Pick<ImmortalRecord, "supplyYear" | "mindKey" | "mintIndex" | "chain" | "txSig">,
  nftMint?: string,
): string {
  if (nftMint) return nftMint;
  if (rec.txSig) return `sol:${rec.txSig.slice(0, 44)}`;
  return `immortal:y${rec.supplyYear}:${rec.mindKey}:${rec.mintIndex}`;
}

async function assertVoucherSig(opts: {
  ownerToken: string;
  voucher: ImmortalVoucher;
  signature: string;
  message: string;
}): Promise<string | null> {
  if (opts.voucher.ownerToken !== opts.ownerToken) return "voucher_mismatch";
  if (!verifyVoucherHmac(opts.voucher)) return "voucher_invalid";
  const linked = await linkedPubkey(opts.ownerToken);
  if (!linked || linked !== opts.voucher.ownerPubkey) return "wallet_unlinked";
  const expected = buildImmortalizeMessage(opts.voucher);
  if (opts.message !== expected) return "message_mismatch";
  const valid = await verifyWalletSig(opts.voucher.ownerPubkey, opts.message, opts.signature);
  if (!valid) return "sig_invalid";
  return null;
}

/** Chain mode: build burn(CARS)+mint(Card) tx after voucher message is signed. */
export async function prepareImmortalizeTx(opts: {
  ownerToken: string;
  voucherId: string;
  signature: string;
  message: string;
}): Promise<
  | {
      ok: true;
      txBase64: string;
      mint: string;
      burnRaw: string;
      fuelMint: string;
      fuelSymbol: string;
    }
  | { ok: false; error: string }
> {
  if (immortalizeMode() !== "chain") return { ok: false, error: "program_not_live" };
  if (!carsChainConfigured()) return { ok: false, error: "program_missing" };

  const voucher = await immStore().peekVoucher(opts.voucherId.trim());
  if (!voucher || voucher.exp <= Date.now()) return { ok: false, error: "voucher_expired" };

  const sigErr = await assertVoucherSig({ ...opts, voucher });
  if (sigErr) return { ok: false, error: sigErr };

  if (!(await ownsCareer(opts.ownerToken, voucher.mindKey))) {
    return { ok: false, error: "not_owner" };
  }
  if (await immStore().getCareer(opts.ownerToken, voucher.mindKey)) {
    return { ok: false, error: "already" };
  }

  const built = await buildCarsImmortalizeTx({ voucher });
  if (!built.ok) return built;
  return {
    ok: true,
    txBase64: built.txBase64,
    mint: built.mint,
    burnRaw: built.burnRaw,
    fuelMint: built.fuelMint,
    fuelSymbol: built.fuelSymbol,
  };
}

export async function confirmImmortalize(opts: {
  ownerToken: string;
  voucherId: string;
  signature: string;
  message: string;
  txSig?: string;
}): Promise<{ ok: true; record: ImmortalRecord } | { ok: false; error: string }> {
  const mode = immortalizeMode();
  if (mode === "off") return { ok: false, error: "off" };

  const store = immStore();
  // Peek first for chain verify; take only after checks pass.
  const peeked = await store.peekVoucher(opts.voucherId.trim());
  if (!peeked || peeked.exp <= Date.now()) return { ok: false, error: "voucher_expired" };

  const sigErr = await assertVoucherSig({ ...opts, voucher: peeked });
  if (sigErr) return { ok: false, error: sigErr };

  let txSig: string | null = null;
  let chain = "attested";
  let nftMint: string | undefined;

  if (mode === "chain") {
    const sig = typeof opts.txSig === "string" ? opts.txSig.trim() : "";
    if (!sig || sig.length < 64 || sig.length > 128) {
      return { ok: false, error: "need_tx" };
    }
    if (!carsChainConfigured()) return { ok: false, error: "program_missing" };

    const pending = await getPendingByVoucher(peeked.id);
    if (!pending) return { ok: false, error: "prepare_missing" };

    const verified = await verifyCarsImmortalizeTx({
      txSig: sig,
      voucher: peeked,
      expectedMint: pending.mint,
    });
    if (!verified.ok) return { ok: false, error: verified.error };

    txSig = sig;
    chain = "solana";
    nftMint = verified.mint;
  }

  const voucher = await store.takeVoucher(opts.voucherId.trim());
  if (!voucher) return { ok: false, error: "voucher_expired" };

  if (!(await ownsCareer(opts.ownerToken, voucher.mindKey))) {
    return { ok: false, error: "not_owner" };
  }
  const existing = await store.getCareer(opts.ownerToken, voucher.mindKey);
  if (existing) return { ok: false, error: "already" };

  const cap = immortalsCapForYear(voucher.supplyYear);
  const n = await store.incrCount(voucher.supplyYear, voucher.mindKey);
  if (n > cap) {
    await store.decrCount(voucher.supplyYear, voucher.mindKey);
    return { ok: false, error: "full" };
  }

  const snap = await loadSnapshot(opts.ownerToken, voucher.mindKey);
  const mintIndex = n;
  const record: ImmortalRecord = {
    mintId: "",
    mindKey: voucher.mindKey,
    ownerToken: opts.ownerToken,
    ownerPubkey: voucher.ownerPubkey,
    supplyYear: voucher.supplyYear,
    mintIndex,
    genesis: voucher.genesis,
    burnAmount: voucher.burnAmount,
    season: voucher.season,
    mintedAt: Date.now(),
    chain,
    txSig,
    snapshot: snap,
  };
  record.mintId = mintIdFor(record, nftMint);

  const placed = await store.putCareerNx(record);
  if (!placed) {
    await store.decrCount(voucher.supplyYear, voucher.mindKey);
    return { ok: false, error: "already" };
  }
  await store.putById(record);
  return { ok: true, record };
}

/** Provenance hook for card builders. */
export async function provenanceFor(
  ownerToken: string,
  mindKey: string,
): Promise<{ mintId: string; owner: string; chain: string; mintedSeason: number; genesis: boolean } | null> {
  const rec = await immStore().getCareer(ownerToken, mindKey.trim().toUpperCase());
  if (!rec) return null;
  return {
    mintId: rec.mintId,
    owner: rec.ownerPubkey,
    chain: rec.chain,
    mintedSeason: rec.season,
    genesis: rec.genesis,
  };
}
