#!/usr/bin/env node
/** Generate a voucher-issuer keypair (signs vouchers only — cannot mint). */
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const kp = Keypair.generate();
console.log("Voucher issuer (NOT a mint authority)");
console.log("  pubkey: ", kp.publicKey.toBase58());
console.log("  secret: ", bs58.encode(kp.secretKey));
console.log("");
console.log("Put secret in CARDS_VOUCHER_ISSUER (server env).");
console.log("Pass pubkey (or secret) into cars:init-program so on-chain config matches.");
