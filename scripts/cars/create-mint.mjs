#!/usr/bin/env node
/**
 * Bootstrap the CARS SPL mint on Solana (mainnet by default).
 * Placeholder test fuel — not product branding.
 *
 * Env:
 *   CARDS_AUTHORITY  base58 secret OR JSON byte array
 *   SOLANA_RPC_URL   default mainnet-beta
 *   CARS_DECIMALS    default 6
 */
import {
  Connection,
  Keypair,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createInitializeMint2Instruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
} from "@solana/spl-token";
import bs58 from "bs58";

function loadAuthority() {
  const raw = process.env.CARDS_AUTHORITY?.trim();
  if (!raw) {
    console.error("Set CARDS_AUTHORITY (base58 secret or JSON byte array).");
    process.exit(1);
  }
  if (raw.startsWith("[")) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  return Keypair.fromSecretKey(bs58.decode(raw));
}

const rpc = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const decimals = Number(process.env.CARS_DECIMALS ?? "6");
const authority = loadAuthority();
const mint = Keypair.generate();
const conn = new Connection(rpc, "confirmed");

const lamports = await getMinimumBalanceForRentExemptMint(conn);
const tx = new Transaction().add(
  SystemProgram.createAccount({
    fromPubkey: authority.publicKey,
    newAccountPubkey: mint.publicKey,
    space: MINT_SIZE,
    lamports,
    programId: TOKEN_PROGRAM_ID,
  }),
  createInitializeMint2Instruction(
    mint.publicKey,
    decimals,
    authority.publicKey,
    authority.publicKey,
    TOKEN_PROGRAM_ID,
  ),
);

const sig = await sendAndConfirmTransaction(conn, tx, [authority, mint]);
console.log("CARS mint created (placeholder fuel)");
console.log("  mint:     ", mint.publicKey.toBase58());
console.log("  authority:", authority.publicKey.toBase58());
console.log("  decimals: ", decimals);
console.log("  tx:       ", sig);
console.log("");
console.log("Add to env:");
console.log(`  CARS_MINT=${mint.publicKey.toBase58()}`);
console.log(`  CARS_DECIMALS=${decimals}`);
console.log(`  IMMORTALIZE_MODE=chain`);
console.log(`  IMMORTALIZE_FUEL_SYMBOL=CARS`);
