#!/usr/bin/env node
/**
 * Initialize card_immortalize config PDA on-chain.
 *
 * Env:
 *   SOLANA_RPC_URL
 *   CARDS_VOUCHER_ISSUER  pubkey or keypair secret (base58 / JSON bytes)
 *   CARS_MINT
 *   CARS_DECIMALS
 *   ANCHOR_WALLET         path to deployer keypair (pays + config.authority)
 */
import fs from "fs";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import bs58 from "bs58";
import idl from "../../lib/solana/idl/card_immortalize.json" with { type: "json" };

const PROGRAM_ID =
  process.env.CARD_IMMORTALIZE_PROGRAM_ID?.trim() ||
  "FNjvsSSqg8VcEuvRpXT1BjGWFe2BWwiQHo6qjoSUme3U";
const rpc = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const fuelMint = process.env.CARS_MINT?.trim();
const decimals = Number(process.env.CARS_DECIMALS ?? "6");
const maxPerMind = Number(process.env.CARS_MAX_PER_MIND ?? "8");

function loadWallet() {
  const p = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`;
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function issuerPubkey() {
  const raw = process.env.CARDS_VOUCHER_ISSUER?.trim();
  if (!raw) throw new Error("CARDS_VOUCHER_ISSUER required");
  if (raw.startsWith("[")) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw))).publicKey;
  }
  const bytes = bs58.decode(raw);
  if (bytes.length === 64) return Keypair.fromSecretKey(bytes).publicKey;
  return new PublicKey(raw);
}

if (!fuelMint) {
  console.error("Set CARS_MINT");
  process.exit(1);
}

const wallet = loadWallet();
const issuer = issuerPubkey();
const conn = new Connection(rpc, "confirmed");
const provider = new AnchorProvider(conn, new Wallet(wallet), { commitment: "confirmed" });
const program = new Program(idl, provider);
const pid = new PublicKey(PROGRAM_ID);
const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], pid);
const [mintAuthority] = PublicKey.findProgramAddressSync([Buffer.from("mint_authority")], pid);

const existing = await conn.getAccountInfo(config);
if (existing) {
  console.log("Config already initialized at", config.toBase58());
  process.exit(0);
}

const ix = await program.methods
  .initialize(maxPerMind, decimals)
  .accounts({
    authority: wallet.publicKey,
    voucherIssuer: issuer,
    fuelMint: new PublicKey(fuelMint),
    config,
    mintAuthority,
    systemProgram: SystemProgram.programId,
  })
  .instruction();

const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
const tx = new Transaction({ feePayer: wallet.publicKey, blockhash, lastValidBlockHeight }).add(ix);
const sig = await sendAndConfirmTransaction(conn, tx, [wallet]);

console.log("Initialized card_immortalize");
console.log("  program:       ", pid.toBase58());
console.log("  config:        ", config.toBase58());
console.log("  mint_authority:", mintAuthority.toBase58());
console.log("  fuel_mint:     ", fuelMint);
console.log("  voucher_issuer:", issuer.toBase58());
console.log("  max_per_mind:  ", maxPerMind);
console.log("  tx:            ", sig);
