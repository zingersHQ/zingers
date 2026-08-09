#!/usr/bin/env node
/**
 * After deployer is topped up: deploy program (if needed) + init config.
 * Reads .env (DEPLOYER / CARS_* / CARDS_VOUCHER_ISSUER).
 */
import fs from "fs";
import { spawnSync } from "child_process";
import bs58 from "bs58";
import { Connection, Keypair } from "@solana/web3.js";

function loadEnv() {
  const out = {};
  for (const line of fs.readFileSync(".env", "utf8").split(/\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

const env = loadEnv();
const rpc = env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const kpPath = "onchain/card_immortalize/.deployer-keypair.json";
if (!fs.existsSync(kpPath)) {
  if (!env.DEPLOYER) throw new Error("DEPLOYER missing");
  const kp = Keypair.fromSecretKey(bs58.decode(env.DEPLOYER));
  fs.writeFileSync(kpPath, JSON.stringify(Array.from(kp.secretKey)));
  fs.chmodSync(kpPath, 0o600);
}
const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(kpPath, "utf8"))));
const conn = new Connection(rpc, "confirmed");
const bal = (await conn.getBalance(kp.publicKey)) / 1e9;
console.log("deployer", kp.publicKey.toBase58(), "balance", bal, "SOL");
// Lean program (~274KB) needs ~1.91 SOL rent + fees + init.
if (bal < 1.95) {
  console.error(`Need ≥ ~1.95 SOL on deployer (have ${bal}). Top up then re-run.`);
  process.exit(2);
}

const deploy = spawnSync(
  "anchor",
  [
    "deploy",
    "--provider.cluster",
    "mainnet",
    "--provider.wallet",
    `${process.cwd()}/${kpPath}`,
  ],
  {
    cwd: "onchain/card_immortalize",
    stdio: "inherit",
    env: { ...process.env, ANCHOR_WALLET: `${process.cwd()}/${kpPath}` },
  },
);
if (deploy.status !== 0) process.exit(deploy.status ?? 1);

const init = spawnSync("npm", ["run", "cars:init-program"], {
  stdio: "inherit",
  env: {
    ...process.env,
    ...env,
    ANCHOR_WALLET: `${process.cwd()}/${kpPath}`,
  },
});
process.exit(init.status ?? 1);
