// Judge consistency & fairness harness. Runs headless bouts through /api/sim and
// asserts the invariants the engine guarantees (lib/engine/judge.ts):
//
//   1. BOUNDS      — every turn's quality is in [0.7, 1.3] or exactly 1.4. The
//                    model can never push damage outside the engine's band.
//   2. HIGHLIGHTS  — the DISPLAYED crit rate stays in a "special but present"
//                    band. Note the engine throttles highlights below the judge's
//                    ~10% flag rate (battle.ts suppresses back-to-back crits), so
//                    the on-screen rate is intentionally lower (a few %).
//   3. DETERMINISM — the same seed reproduces the SAME quality sequence + winner,
//                    proving the "seeded, provably-fair" claim (docs/bible/08).
//
// Works with OR without an LLM key: keyless runs exercise the deterministic mock
// judge; with XAI_API_KEY set + mock=0 it scores the real judge. Fits the repo's
// HTTP-integration convention (see scripts/test-agents.mjs) — point it at a
// running server: `npm run dev` then `npm run test:judge`.

const BASE = process.env.SIM_BASE || "http://localhost:3000";
const LIVE = process.env.JUDGE_LIVE === "1"; // score the real LLM judge (mock=0)
const BOUTS = Number(process.env.JUDGE_BOUTS || 12);

const Q_MIN = 0.7;
const Q_MAX = 1.3;
const Q_HIGHLIGHT = 1.4;
const PAIRS = [
  ["AXIOM", "VOX"],
  ["GLITCH", "BASTION"],
  ["MUSE", "EMBER"],
  ["EMBER", "AXIOM"],
];

async function sim(a, b, seed) {
  const mock = LIVE ? "0" : "1";
  const url = `${BASE}/api/sim?a=${a}&b=${b}&seed=${seed}&mock=${mock}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`sim ${a} vs ${b} → HTTP ${r.status} (is the dev server up at ${BASE}?)`);
  return r.json();
}

const legal = (q) => q === Q_HIGHLIGHT || (Number.isFinite(q) && q >= Q_MIN && q <= Q_MAX);

async function main() {
  console.log(`judge-check → ${BASE}  (${LIVE ? "LIVE judge" : "mock judge"}, ${BOUTS} bouts)`);
  let turns = 0;
  let highlights = 0;
  const violations = [];

  // 1 + 2: bounds & highlight rate across many bouts
  for (let i = 0; i < BOUTS; i++) {
    const [a, b] = PAIRS[i % PAIRS.length];
    const { turns: ts } = await sim(a, b, 1000 + i);
    for (const t of ts) {
      turns++;
      if (!legal(t.q)) violations.push(`bout ${i} r${t.round}: q=${t.q} out of band`);
      if (t.q === Q_HIGHLIGHT || t.info?.crit) highlights++;
    }
  }

  // 3: determinism — same seed, twice, identical quality stream + winner
  const r1 = await sim("AXIOM", "VOX", 4242);
  const r2 = await sim("AXIOM", "VOX", 4242);
  const q1 = r1.turns.map((t) => t.q).join(",");
  const q2 = r2.turns.map((t) => t.q).join(",");
  const deterministic = q1 === q2 && r1.end.winner === r2.end.winner;

  // Displayed crits are throttled (see header); they must be PRESENT but stay
  // special — never a runaway. Floor catches "highlights broken/absent",
  // ceiling catches "every line is a crit".
  const hlRate = turns ? highlights / turns : 0;
  const hlOk = hlRate > 0 && hlRate <= 0.2;

  console.log(`  turns scored : ${turns}`);
  console.log(`  bounds       : ${violations.length === 0 ? "PASS" : `FAIL (${violations.length})`}`);
  console.log(`  highlightRate: ${(hlRate * 100).toFixed(1)}%  ${hlOk ? "PASS" : "FAIL (want >0% and ≤20%)"}`);
  console.log(`  determinism  : ${deterministic ? "PASS" : "FAIL (same seed diverged)"}`);
  for (const v of violations.slice(0, 5)) console.log(`    • ${v}`);

  if (violations.length || !hlOk || !deterministic) {
    console.error("judge-check: FAILED");
    process.exit(1);
  }
  console.log("judge-check: PASSED");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
