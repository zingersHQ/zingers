# CARS / Cards — Immortalize on-chain (test brand)

**Not Zingers product branding.** Placeholder Solana lane to prove burn → Card mint
with **on-chain supply caps**. Users call the program. Server only issues vouchers.

| Product (later) | This test lane |
|-----------------|----------------|
| `$ZING` | **CARS** (any SPL mint, e.g. pump.fun) |
| Immortal card | **Card** NFT |
| Champion art | **Car model** SVG placeholders |
| Program | `card_immortalize` |

Program id (local keypair): `FNjvsSSqg8VcEuvRpXT1BjGWFe2BWwiQHo6qjoSUme3U`

## Security model

- **Mint authority** = program PDA (`mint_authority`). Not on the server.
- **Voucher issuer** = ed25519 key that only signs short-lived vouchers. Cannot mint alone.
- **M per mind** = on-chain `mind_counter` PDA (default 8).
- **One stamp per card** = `career_stamp` PDA (`owner` + `year` + `mind` + `mint_index`).
- **Replay** = `voucher` PDA keyed by nonce.
- **Lean Card** = classic SPL (0 decimals, supply 1, auth revoked). No Metaplex in v0.2 — keeps deploy under ~2 SOL. Display JSON at `/api/cars/card/[mint]`.

Server compromised → can issue bad vouchers until you rotate issuer / pause.  
Server **cannot** mint unlimited Cards without a valid program path.

**Keys:** `DEPLOYER` is only for CLI upgrade/deploy (fine in local `.env` for mainnet tests). `CARDS_VOUCHER_ISSUER` may live on Vercel. Never put the deployer on Vercel.

## Deploy (mainnet — real SOL)

```bash
# 0) Fund ~/.config/solana/id.json with SOL for deploy + init
npm run cars:gen-issuer          # → CARDS_VOUCHER_ISSUER secret + pubkey
# Create or pick fuel mint:
npm run cars:create-mint         # OR set CARS_MINT=<pump.fun mint>

# 1) Build + deploy program
bash scripts/cars/deploy-program.sh mainnet

# 2) Init config (max M=8, fuel mint, voucher issuer)
CARDS_VOUCHER_ISSUER=... CARS_MINT=... npm run cars:init-program

# 3) App env (Vercel)
IMMORTALIZE_MODE=chain
CARS_MINT=...
CARS_DECIMALS=6
CARDS_VOUCHER_ISSUER=<secret>
CARD_IMMORTALIZE_PROGRAM_ID=FNjvsSSqg8VcEuvRpXT1BjGWFe2BWwiQHo6qjoSUme3U
SOLANA_RPC_URL=<paid RPC>
NEXT_PUBLIC_APP_URL=https://your-host
IMMORTALIZE_FUEL_SYMBOL=CARS
```

## User flow

1. Wallet linked + owns career → server voucher (HMAC + ed25519 program voucher)
2. Client sends **one tx**: Ed25519 verify ix + `immortalize` ix
3. Program burns fuel, mints Card, bumps counters
4. Server indexes provenance from tx (optional Redis)

## Costs (ballpark mainnet)

| Step | Cost |
|------|------|
| Deploy program | ~1–3 SOL once (buffer + program account) |
| Init config | ~0.002 SOL once |
| Each Immortalize | user pays ~0.02–0.05 SOL (NFT rent + fees) + burned CARS |

## Source

- Program: `onchain/card_immortalize/`
- IDL copy: `lib/solana/idl/card_immortalize.json`
- Tx builder: `lib/server/card-program.ts`
