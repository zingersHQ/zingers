// Build txs that call the card_immortalize program (no hot mint authority).
import "server-only";
import {
  Connection,
  Ed25519Program,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { Redis } from "@upstash/redis";
import type { ImmortalVoucher } from "@/lib/immortalize";
import { cardDisplayName, carModelForKey } from "@/lib/cars/brand";
import {
  buildVoucherMessage,
  metaHash,
  mindHash,
  programId,
} from "@/lib/solana/card-immortalize";
import idl from "@/lib/solana/idl/card_immortalize.json";
import {
  appPublicUrl,
  carsDecimals,
  carsMintAddress,
  fuelSymbol,
  solanaRpcUrl,
} from "@/lib/server/solana-env";

export interface CarsCardMeta {
  mint: string;
  voucherId: string;
  mindKey: string;
  modelId: string;
  name: string;
  burnAmount: number;
  mintIndex: number;
  genesis: boolean;
  ownerPubkey: string;
  createdAt: number;
}

const PENDING_TTL_SEC = 15 * 60;

function redis(): Redis | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const memPending = new Map<string, { meta: CarsCardMeta; exp: number }>();
const memByVoucher = new Map<string, string>();

export function voucherIssuerKeypair(): Keypair {
  const raw = process.env.CARDS_VOUCHER_ISSUER?.trim();
  if (!raw) throw new Error("CARDS_VOUCHER_ISSUER missing");
  if (raw.startsWith("[")) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  return Keypair.fromSecretKey(bs58.decode(raw));
}

export function cardProgramConfigured(): boolean {
  try {
    if (!carsMintAddress()) return false;
    if (!process.env.CARDS_VOUCHER_ISSUER?.trim()) return false;
    if (!programId()) return false;
    voucherIssuerKeypair();
    return true;
  } catch {
    return false;
  }
}

function connection(): Connection {
  return new Connection(solanaRpcUrl(), "confirmed");
}

function dummyProvider(conn: Connection): AnchorProvider {
  // Read-only provider — we only build instructions, never send from here.
  // Inline wallet stub: ESM Anchor build does not export NodeWallet/Wallet.
  const kp = Keypair.generate();
  const wallet = {
    publicKey: kp.publicKey,
    async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
      return tx;
    },
    async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
      return txs;
    },
  };
  return new AnchorProvider(conn, wallet, { commitment: "confirmed" });
}

function program(conn: Connection): Program {
  return new Program(idl as never, dummyProvider(conn));
}

async function putPending(meta: CarsCardMeta): Promise<void> {
  const r = redis();
  if (r) {
    await r.set(`z:cars:pending:${meta.mint}`, meta, { ex: PENDING_TTL_SEC });
    await r.set(`z:cars:pv:${meta.voucherId}`, meta.mint, { ex: PENDING_TTL_SEC });
    await r.set(`z:cars:meta:${meta.mint}`, meta, { ex: 60 * 60 * 24 * 365 });
    return;
  }
  memPending.set(meta.mint, { meta, exp: Date.now() + PENDING_TTL_SEC * 1000 });
  memByVoucher.set(meta.voucherId, meta.mint);
}

export async function getCardMeta(mint: string): Promise<CarsCardMeta | null> {
  const r = redis();
  if (r) {
    return (
      (await r.get<CarsCardMeta>(`z:cars:meta:${mint}`)) ??
      (await r.get<CarsCardMeta>(`z:cars:pending:${mint}`)) ??
      null
    );
  }
  const p = memPending.get(mint);
  if (p && p.exp > Date.now()) return p.meta;
  return null;
}

export async function getPendingByVoucher(voucherId: string): Promise<CarsCardMeta | null> {
  const r = redis();
  if (r) {
    const mint = await r.get<string>(`z:cars:pv:${voucherId}`);
    if (!mint) return null;
    return (await r.get<CarsCardMeta>(`z:cars:pending:${mint}`)) ?? null;
  }
  const mint = memByVoucher.get(voucherId);
  if (!mint) return null;
  const p = memPending.get(mint);
  if (!p || p.exp < Date.now()) return null;
  return p.meta;
}

function burnRawAmount(display: number): bigint {
  const dec = carsDecimals();
  return BigInt(Math.max(0, Math.floor(display))) * BigInt(10) ** BigInt(dec);
}

/** Build ed25519-verify + immortalize program ix. Only card_mint keypair is partial-signed (account create). */
export async function buildProgramImmortalizeTx(opts: {
  voucher: ImmortalVoucher;
}): Promise<
  | {
      ok: true;
      txBase64: string;
      mint: string;
      burnRaw: string;
      fuelMint: string;
      fuelSymbol: string;
      programId: string;
    }
  | { ok: false; error: string }
> {
  if (!cardProgramConfigured()) return { ok: false, error: "program_missing" };

  const fuelMintStr = carsMintAddress()!;
  const fuelMint = new PublicKey(fuelMintStr);
  const owner = new PublicKey(opts.voucher.ownerPubkey);
  const conn = connection();
  const burnRaw = burnRawAmount(opts.voucher.burnAmount);
  const issuer = voucherIssuerKeypair();

  const fuelMintInfo = await conn.getAccountInfo(fuelMint);
  if (!fuelMintInfo) return { ok: false, error: "fuel_mint_missing" };
  const fuelTokenProgram = fuelMintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;
  const ownerAta = getAssociatedTokenAddressSync(fuelMint, owner, false, fuelTokenProgram);
  const ataInfo = await conn.getAccountInfo(ownerAta);
  if (!ataInfo) return { ok: false, error: "no_fuel_ata" };
  const bal = await conn.getTokenAccountBalance(ownerAta).catch(() => null);
  const have = bal?.value?.amount ? BigInt(bal.value.amount) : BigInt(0);
  if (have < burnRaw) return { ok: false, error: "insufficient_fuel" };

  const model = carModelForKey(opts.voucher.mindKey);
  const name = cardDisplayName(model, opts.voucher.mintIndex, opts.voucher.genesis).slice(0, 32);

  const cardMint = Keypair.generate();
  const uri = `${appPublicUrl()}/api/cars/card/${cardMint.publicKey.toBase58()}`.slice(0, 200);
  const mHashMeta = await metaHash(name, uri);

  const nonce = new Uint8Array(16);
  for (let i = 0; i < 16; i++) nonce[i] = Math.floor(Math.random() * 256);

  const expSec = BigInt(Math.floor(opts.voucher.exp / 1000));
  const mHash = await mindHash(opts.voucher.mindKey);
  const year = opts.voucher.supplyYear;
  const genesis = opts.voucher.genesis ? 1 : 0;
  const mintIndex = opts.voucher.mintIndex;

  const message = buildVoucherMessage({
    owner: owner.toBytes(),
    mindHash: mHash,
    burnAmount: burnRaw,
    mintIndex,
    year,
    genesis,
    exp: expSec,
    nonce,
    metaHash: mHashMeta,
  });

  const signature = nacl.sign.detached(message, issuer.secretKey);
  const edIx = Ed25519Program.createInstructionWithPublicKey({
    publicKey: issuer.publicKey.toBytes(),
    message,
    signature,
  });

  const prog = program(conn);
  const pid = new PublicKey(programId());
  const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], pid);
  const [mintAuthority] = PublicKey.findProgramAddressSync([Buffer.from("mint_authority")], pid);
  const yearBuf = Buffer.alloc(4);
  yearBuf.writeUInt32LE(year);
  const [mindCounter] = PublicKey.findProgramAddressSync(
    [Buffer.from("mind"), yearBuf, Buffer.from(mHash)],
    pid,
  );
  const mintIndexBuf = Buffer.alloc(2);
  mintIndexBuf.writeUInt16LE(mintIndex);
  const [careerStamp] = PublicKey.findProgramAddressSync(
    [Buffer.from("career"), owner.toBuffer(), yearBuf, Buffer.from(mHash), mintIndexBuf],
    pid,
  );
  const [voucherUsed] = PublicKey.findProgramAddressSync(
    [Buffer.from("voucher"), Buffer.from(nonce)],
    pid,
  );

  // Dedicated token account (not ATA) — keeps program free of ATA CPI weight.
  const ownerCardAta = Keypair.generate();

  const immIx = await prog.methods
    .immortalize(
      Array.from(mHash),
      new BN(burnRaw.toString()),
      mintIndex,
      year,
      genesis,
      new BN(expSec.toString()),
      Array.from(nonce),
      Array.from(mHashMeta),
    )
    .accounts({
      owner,
      config,
      mintAuthority,
      mindCounter,
      careerStamp,
      voucherUsed,
      fuelMint,
      ownerFuelAta: ownerAta,
      cardMint: cardMint.publicKey,
      ownerCardAta: ownerCardAta.publicKey,
      instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: owner, blockhash, lastValidBlockHeight });
  tx.add(edIx);
  tx.add(immIx);
  // New account keys only — mint authority remains the program PDA.
  tx.partialSign(cardMint, ownerCardAta);

  const meta: CarsCardMeta = {
    mint: cardMint.publicKey.toBase58(),
    voucherId: opts.voucher.id,
    mindKey: opts.voucher.mindKey,
    modelId: model.id,
    name,
    burnAmount: opts.voucher.burnAmount,
    mintIndex,
    genesis: opts.voucher.genesis,
    ownerPubkey: opts.voucher.ownerPubkey,
    createdAt: Date.now(),
  };
  await putPending(meta);

  return {
    ok: true,
    txBase64: Buffer.from(
      tx.serialize({ requireAllSignatures: false, verifySignatures: false }),
    ).toString("base64"),
    mint: cardMint.publicKey.toBase58(),
    burnRaw: burnRaw.toString(),
    fuelMint: fuelMintStr,
    fuelSymbol: fuelSymbol(),
    programId: pid.toBase58(),
  };
}

/** Broadcast a fully signed Immortalize tx via server RPC (keeps paid RPC keys off the client). */
export async function broadcastSignedTx(txBase64: string): Promise<
  { ok: true; signature: string } | { ok: false; error: string }
> {
  let raw: Buffer;
  try {
    raw = Buffer.from(txBase64, "base64");
  } catch {
    return { ok: false, error: "bad_tx" };
  }
  if (raw.length < 64 || raw.length > 1232) return { ok: false, error: "bad_tx" };

  const conn = connection();
  try {
    const sig = await conn.sendRawTransaction(raw, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
      maxRetries: 3,
    });
    const latest = await conn.getLatestBlockhash("confirmed");
    await conn.confirmTransaction(
      { signature: sig, ...latest },
      "confirmed",
    );
    return { ok: true, signature: sig };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "tx_failed";
    if (/blockhash|expired|not confirmed/i.test(msg)) return { ok: false, error: "tx_failed" };
    return { ok: false, error: "tx_failed" };
  }
}

/** Confirm career_stamp PDA exists for this owner+mind and matches expected mint. */
export async function verifyProgramImmortalizeTx(opts: {
  txSig: string;
  voucher: ImmortalVoucher;
  expectedMint: string;
}): Promise<{ ok: true; mint: string } | { ok: false; error: string }> {
  const conn = connection();
  let tx = await conn.getTransaction(opts.txSig, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) {
    await new Promise((r) => setTimeout(r, 1500));
    tx = await conn.getTransaction(opts.txSig, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
  }
  if (!tx || tx.meta?.err) return { ok: false, error: "tx_failed" };

  const owner = new PublicKey(opts.voucher.ownerPubkey);
  const mHash = await mindHash(opts.voucher.mindKey);
  const pid = new PublicKey(programId());
  const yearBuf = Buffer.alloc(4);
  yearBuf.writeUInt32LE(opts.voucher.supplyYear);
  const mintIndexBuf = Buffer.alloc(2);
  mintIndexBuf.writeUInt16LE(opts.voucher.mintIndex);
  const [careerStamp] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("career"),
      owner.toBuffer(),
      yearBuf,
      Buffer.from(mHash),
      mintIndexBuf,
    ],
    pid,
  );
  const info = await conn.getAccountInfo(careerStamp);
  if (!info) return { ok: false, error: "mint_mismatch" };

  // Token post-balance: owner holds 1 of expected mint
  const post = tx.meta?.postTokenBalances ?? [];
  const nft = post.find(
    (p) =>
      p.mint === opts.expectedMint &&
      p.owner === opts.voucher.ownerPubkey &&
      p.uiTokenAmount.amount === "1",
  );
  if (!nft) return { ok: false, error: "mint_mismatch" };

  const fuelMint = carsMintAddress()!;
  const burnRaw = burnRawAmount(opts.voucher.burnAmount);
  const pre = tx.meta?.preTokenBalances ?? [];
  let burned = BigInt(0);
  for (const before of pre) {
    if (before.mint !== fuelMint) continue;
    if (before.owner && before.owner !== opts.voucher.ownerPubkey) continue;
    const after = post.find(
      (p) =>
        p.accountIndex === before.accountIndex ||
        (p.mint === fuelMint && p.owner === opts.voucher.ownerPubkey),
    );
    const preAmt = BigInt(before.uiTokenAmount.amount);
    const postAmt = after ? BigInt(after.uiTokenAmount.amount) : BigInt(0);
    if (preAmt > postAmt) burned += preAmt - postAmt;
  }
  if (burned < burnRaw) return { ok: false, error: "burn_mismatch" };

  return { ok: true, mint: opts.expectedMint };
}
