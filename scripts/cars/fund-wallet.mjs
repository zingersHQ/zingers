#!/usr/bin/env node
/**
 * Mint CARS test fuel to a wallet ATA (mainnet costs real SOL for ATA rent).
 *
 * Usage:
 *   node scripts/cars/fund-wallet.mjs --to <PUBKEY> --amount 10000
 *
 * Env: CARDS_AUTHORITY, CARS_MINT, SOLANA_RPC_URL, CARS_DECIMALS
 */
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import bs58 from "bs58";

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function loadAuthority() {
  const raw = process.env.CARDS_AUTHORITY?.trim();
  if (!raw) {
    console.error("Set CARDS_AUTHORITY.");
    process.exit(1);
  }
  if (raw.startsWith("[")) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  return Keypair.fromSecretKey(bs58.decode(raw));
}

const to = arg("--to");
const amountUi = Number(arg("--amount", "1000"));
const mintStr = process.env.CARS_MINT?.trim();
if (!to || !mintStr) {
  console.error("Need --to <PUBKEY> and CARS_MINT env.");
  process.exit(1);
}

const decimals = Number(process.env.CARS_DECIMALS ?? "6");
const rpc = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const authority = loadAuthority();
const mint = new PublicKey(mintStr);
const owner = new PublicKey(to);
const ata = getAssociatedTokenAddressSync(mint, owner, false, TOKEN_PROGRAM_ID);
const raw = BigInt(Math.floor(amountUi)) * 10n ** BigInt(decimals);

const conn = new Connection(rpc, "confirmed");
const tx = new Transaction().add(
  createAssociatedTokenAccountIdempotentInstruction(
    authority.publicKey,
    ata,
    owner,
    mint,
    TOKEN_PROGRAM_ID,
  ),
  createMintToCheckedInstruction(
    mint,
    ata,
    authority.publicKey,
    raw,
    decimals,
    [],
    TOKEN_PROGRAM_ID,
  ),
);

const sig = await sendAndConfirmTransaction(conn, tx, [authority]);
console.log("Funded CARS (placeholder fuel)");
console.log("  to:   ", owner.toBase58());
console.log("  ata:  ", ata.toBase58());
console.log("  amount:", amountUi, "CARS");
console.log("  tx:   ", sig);
