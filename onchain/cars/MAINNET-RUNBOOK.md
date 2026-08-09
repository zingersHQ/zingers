# CARS Immortalize — mainnet runbook

## Keys (test vs product)

| Key | Role | Mainnet test OK? | Production |
|-----|------|------------------|------------|
| `DEPLOYER` / `.deployer-keypair.json` | Program upgrade authority | Yes, local `.env` only | Hardware / cold; never Vercel |
| `CARDS_VOUCHER_ISSUER` | Signs short-lived Immortalize vouchers | Yes in `.env` + Vercel | Rotate; prefer KMS/HSM later |
| Program PDA `mint_authority` | Mint authority for Cards | On-chain only | Same — never a server secret |

**The current deployer private key is not “wrong” for a throwaway CARS test on mainnet.** It is a normal upgrade-authority key while you iterate. What matters:

1. Do **not** put `DEPLOYER` on Vercel or in the app.
2. Treat `CARDS_VOUCHER_ISSUER` as a hot key that can issue burns/mints **only through the program path** (caps, pause, nonce still apply). Rotate before real product launch.
3. If this chat/logs ever printed `DEPLOYER`, rotate before anything valuable lives behind that program id.

## Status

| Item | Value |
|------|--------|
| Deployer pubkey | `Hc4TgXTY5EZGcf9yVp1ypFyhMQTY28YsCPt8CweVkMit` |
| CARS mint | `GGgBpC2gF7Ls3uui8B7PMxgH4butRcECEZ9yEgxNpump` (6 decimals, **Token-2022**) |
| Program id | `FNjvsSSqg8VcEuvRpXT1BjGWFe2BWwiQHo6qjoSUme3U` |
| Config PDA | `63is7s3saNkmsprkkX9T5TqMDUF2qgm8EJP7mMbH4d31` |
| Mint authority PDA | `Dq4P9RqTbwAURn6gWQVbtpbQQ2sisNwb5Gt38S177zmi` |
| Voucher issuer pubkey | `BauPkvof9d69FmHzBV3GvKEKkMirugTqRXS2VviLiPyx` |
| Binary | lean (~276 KB): burn Token/Token-2022 fuel; mint classic SPL Card |
| Program rent | **~1.92 SOL** |
| Deploy + init | **Done** (mainnet) |
| Card shape | decimals 0, supply 1, mint+freeze auth revoked; metadata via `/api/cars/card/[mint]` |

Older id `F4tW…` was closed (reclaimed rent). Use `FNjv…` only.

## 1) Deploy + init

```bash
set -a && source .env && set +a
solana config set --url https://api.mainnet-beta.solana.com \
  --keypair onchain/card_immortalize/.deployer-keypair.json
solana balance   # need ≥ ~1.95 SOL (rent ~1.91 + fees + init)

cd onchain/card_immortalize
anchor deploy --provider.cluster mainnet \
  --provider.wallet "$PWD/.deployer-keypair.json"

cd ../..
npm run cars:init-program
```

Or: `npm run cars:finish-mainnet` if that script is wired to the same steps.

`cars:init-program` writes on-chain config: fuel = CARS, M = 8, voucher issuer pubkey, admin = deployer.

### Admin ix (upgrade path without redeploy)

- `set_paused` — kill switch
- `set_voucher_issuer` — rotate issuer after leak
- `set_max_per_mind` — change M (1..64)
- `set_authority` — hand admin to a multisig later

`Config.reserved[32]` is zeroed for future flags/fees without resizing if you plan carefully; resizing still needs an upgrade path.

## 2) Local e2e (after deploy + init)

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run dev
```

1. Buy CARS on the market into your play wallet (pump mint auth is usually revoked — no `cars:fund`).
2. Link wallet (SIWS) → own a career → Immortalize.
3. Approve the program tx (ed25519 + burn CARS + mint Card).

Wallets may show a bare SPL mint until you add Metaplex/Core metadata in a later upgrade. Game UI uses `/api/cars/card/[mint]`.

## 3) Vercel env

| # | Name | Value |
|---|------|--------|
| 1 | `IMMORTALIZE_MODE` | `chain` |
| 2 | `CARS_MINT` | `GGgBpC2gF7Ls3uui8B7PMxgH4butRcECEZ9yEgxNpump` |
| 3 | `CARS_DECIMALS` | `6` |
| 4 | `IMMORTALIZE_FUEL_SYMBOL` | `CARS` |
| 5 | `CARD_IMMORTALIZE_PROGRAM_ID` | `FNjvsSSqg8VcEuvRpXT1BjGWFe2BWwiQHo6qjoSUme3U` |
| 6 | `CARDS_VOUCHER_ISSUER` | base58 secret from local `.env` (issuer only) |
| 7 | `SOLANA_RPC_URL` | Helius (or paid) mainnet RPC — **server only** |
| 8 | `NEXT_PUBLIC_APP_URL` | `https://zingers.gg` |
| 9 | `IMMORTALIZE_SECRET` | long random (HMAC app vouchers) |
| 10 | Redis / Upstash | existing `KV_*` / `UPSTASH_*` |

**Never** put `DEPLOYER` or `ANCHOR_WALLET` on Vercel.  
**Never** set `NEXT_PUBLIC_SOLANA_RPC_URL` with a keyed RPC. The browser signs; `/api/immortalize` `broadcast` submits via server `SOLANA_RPC_URL`.

## Threat model (honest)

| Threat | Mitigated? |
|--------|------------|
| Server mints unlimited without burn | Yes — no mint key on server; program burns + caps |
| Replay voucher | Yes — `voucher` PDA by nonce |
| Over-mint per mind/year | Yes — `mind_counter` + `mint_index == count+1` |
| Duplicate career slot | Yes — `career_stamp` PDA per owner/year/mind/index |
| Compromised issuer | Partial — pause + rotate issuer; already-issued vouchers until `exp` |
| Compromised deployer | Can upgrade program — keep cold |
| Mutable off-chain JSON | Yes by design for test; bind `meta_hash` in stamp; later pin IPFS |
| Wallet “NFT” recognition | No Metaplex yet — intentional size cut |

## Later (when SOL / product ready)

1. Multisig as `authority`.
2. Optional Metaplex Core / Token Metadata CPI in a **new** program or upgrade once funded.
3. Audit ed25519 parsing + Anchor accounts.
4. Rotate issuer; freeze max_per_mind; document upgrade policy.
