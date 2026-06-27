// LLM cost scenarios — answers the "model real costs before monetization" gate
// (AGENCY.md §Launch gate 4 / §Economics). Mirrors the live formula in
// lib/server/cost.ts so the numbers stay in sync, and sweeps DAU scenarios so
// the marginal cost of one ranked duel and the monthly burn are explicit.
//
// Pure math, no server required:  node scripts/cost-scenarios.mjs
// Override any assumption via env (same vars as the live model where they exist):
//   ZINGERS_PRICE_IN / ZINGERS_PRICE_OUT  — USD per 1M tokens (default 0.20 / 0.50)
//   CALLS_PER_BOUT   — actor+judge calls per duel (default 16, per cost.ts)
//   BPP              — live bouts a player runs/watches per day (default 5)
//   LEAGUE_PAID      — autonomous league bouts/day that spend REAL LLM (default 0:
//                      the league runs mock=1/free by default — see app/api/sim)
//
// Two token profiles are printed: the model's optimistic per-call default
// (450 in / 120 out) and a CONSERVATIVE profile (context grows across ~7 turns).

const PRICE_IN = Number(process.env.ZINGERS_PRICE_IN ?? 0.2); // $/1M in
const PRICE_OUT = Number(process.env.ZINGERS_PRICE_OUT ?? 0.5); // $/1M out
const CALLS_PER_BOUT = Number(process.env.CALLS_PER_BOUT ?? 16);
const BPP = Number(process.env.BPP ?? 5);
const LEAGUE_PAID = Number(process.env.LEAGUE_PAID ?? 0);

const usdFor = (inTok, outTok) => (inTok / 1e6) * PRICE_IN + (outTok / 1e6) * PRICE_OUT;

const PROFILES = [
  { label: "model default (optimistic)", avgIn: 450, avgOut: 120 },
  { label: "conservative (ctx grows)", avgIn: 1500, avgOut: 220 },
];
const DAUS = [100, 500, 2000, 10000];

const usd = (n) => (n < 10 ? `$${n.toFixed(4)}` : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`);

console.log(`\nZingers LLM cost scenarios`);
console.log(`pricing: $${PRICE_IN}/1M in · $${PRICE_OUT}/1M out · ${CALLS_PER_BOUT} calls/duel · ${BPP} duels/player/day · league paid bouts/day: ${LEAGUE_PAID}\n`);

for (const p of PROFILES) {
  const perCall = usdFor(p.avgIn, p.avgOut);
  const perBout = CALLS_PER_BOUT * perCall;
  console.log(`── ${p.label}  (${p.avgIn} in / ${p.avgOut} out per call) ──`);
  console.log(`   marginal cost of ONE ranked duel: ${usd(perBout)}\n`);
  console.log(`   DAU     bouts/day     monthly burn`);
  for (const dau of DAUS) {
    const boutsPerDay = dau * BPP + LEAGUE_PAID;
    const monthly = perBout * boutsPerDay * 30;
    console.log(`   ${String(dau).padStart(6)}  ${String(boutsPerDay).padStart(10)}     ${usd(monthly).padStart(12)}`);
  }
  console.log("");
}

console.log(`Note: the autonomous league defaults to mock=1 (free); set LEAGUE_PAID to`);
console.log(`model spending real inference on self-play. Re-measure avgIn/avgOut from`);
console.log(`GET /api/cost (it self-calibrates from real usage) and feed them back here.\n`);
