// The headline agent loop: a fighter that improves ITSELF to climb the ladder.
// Each round it (1) fights a ranked bout with its current doctrine, (2) reads the
// transcript, (3) reflects and rewrites its own three dials + memory, then (4)
// faces a tougher opponent. Tool use (the battle engine), memory, a reflection
// step, and autonomy — a real OODA loop, not a single generation.
import "server-only";
import { battleEvents } from "@/lib/engine/battle";
import { ROSTER, TOPICS } from "@/lib/engine/roster";
import { chat, KEY, makeRng, parseJson } from "@/lib/engine/xai";
import { DEFAULT_STRAT, type AutoplayEvent, type BattleTurn, type Strat } from "@/lib/types";

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
const statSum = (k: string) => Object.values(ROSTER[k].stats).reduce((a, b) => a + b, 0);

// The agent reflects on the bout and rewrites its OWN doctrine. With a live key
// this is a real LLM reasoning step ("I hoarded my finisher"); offline it falls
// back to a deterministic coach so the loop still demos with no key.
async function reflect(
  learnerName: string,
  oppName: string,
  oppType: string,
  won: boolean,
  strat: Strat,
  summary: string,
  live: boolean,
): Promise<{ strat: Strat; note: string }> {
  if (live) {
    const sys =
      "You are an autonomous agent that fights debate bouts and tunes your OWN doctrine to climb a ladder. " +
      "Three dials, 0-100: RISK (swing for finishers vs play safe), FOCUS (set up Exposed/Tilted combos first vs just hit), " +
      "AGGRESSION (raw power and tempo vs patient counter-punching). Read the last bout and adjust your dials to win more next time. " +
      "Reply ONLY as JSON.";
    const usr =
      `You are ${learnerName}. Your current dials are risk ${strat.risk}, focus ${strat.focus}, aggression ${strat.aggression}. ` +
      `Last bout vs ${oppName} (a ${oppType} type): you ${won ? "WON" : "LOST"}. ${summary}\n` +
      'Return {"risk": <0-100>, "focus": <0-100>, "aggression": <0-100>, "note": "<one first-person lesson, max 16 words>"}.';
    const out = parseJson<{ risk?: number; focus?: number; aggression?: number; note?: string }>(
      await chat([{ role: "system", content: sys }, { role: "user", content: usr }], 0.5, 140),
    );
    if (out) {
      return {
        strat: {
          risk: clamp(out.risk ?? strat.risk),
          focus: clamp(out.focus ?? strat.focus),
          aggression: clamp(out.aggression ?? strat.aggression),
        },
        note: (out.note || "Adjusting my approach.").slice(0, 120),
      };
    }
  }
  // Deterministic coach (no key): nudge toward the lesson the result implies.
  if (!won) {
    const next: Strat = {
      risk: clamp(strat.risk - 6),
      focus: clamp(strat.focus + 12),
      aggression: clamp(strat.aggression + (strat.aggression < 55 ? 8 : -4)),
    };
    return { strat: next, note: `Lost to ${oppName} — set up the combo before I swing.` };
  }
  const next: Strat = {
    risk: clamp(strat.risk + 4),
    focus: clamp(strat.focus + 2),
    aggression: clamp(strat.aggression + 3),
  };
  return { strat: next, note: `Beat ${oppName} — leaning harder into what worked.` };
}

export async function* autoplayRun(
  learner: string,
  rounds: number,
  mock: boolean,
  seed?: number | null,
): AsyncGenerator<AutoplayEvent> {
  const rng = makeRng(seed);
  const live = !!KEY && !mock;
  let strat: Strat = { ...DEFAULT_STRAT };
  const memory: string[] = [];
  let elo = 1000;
  let wins = 0;
  let losses = 0;

  // Climb: weakest opponent first, then progressively tougher.
  const ladder = Object.keys(ROSTER)
    .filter((k) => k !== learner)
    .sort((a, b) => statSum(a) - statSum(b));

  yield {
    type: "start",
    learner,
    learnerName: ROSTER[learner].name,
    learnerType: ROSTER[learner].type,
    rounds,
    strat: { ...strat },
    elo,
    live,
  };

  for (let r = 1; r <= rounds; r++) {
    const opp = ladder[(r - 1) % ladder.length];
    const topic = TOPICS[Math.floor(rng.random() * TOPICS.length)];
    yield {
      type: "round",
      round: r,
      opponent: opp,
      opponentName: ROSTER[opp].name,
      opponentType: ROSTER[opp].type,
      topic,
    };

    const turns: BattleTurn[] = [];
    let aHp = 0;
    let bHp = 0;
    let winner = "";
    let boutRounds = 0;
    for await (const ev of battleEvents(learner, opp, topic, mock, null, { strat, memory }, {})) {
      if (ev.type === "turn") turns.push(ev);
      else if (ev.type === "end") {
        winner = ev.winner;
        aHp = ev.a_hp;
        bHp = ev.b_hp;
        boutRounds = ev.rounds;
      }
    }
    const won = winner === learner;
    const mine = turns.filter((t) => t.actor === learner);
    const best = mine.reduce<BattleTurn | null>((a, b) => (a && a.dmg >= b.dmg ? a : b), null);

    yield {
      type: "bout",
      round: r,
      won,
      winnerName: ROSTER[winner]?.name ?? "—",
      rounds: boutRounds,
      learnerHp: aHp,
      oppHp: bHp,
      bestLine: best?.line ?? "",
    };

    const eloDelta = won ? 20 + Math.round(rng.random() * 12) : -(12 + Math.round(rng.random() * 10));
    elo += eloDelta;
    if (won) wins++;
    else losses++;

    const movesUsed = [...new Set(mine.map((t) => t.move))].join(", ") || "no clean hits";
    const summary =
      `You leaned on: ${movesUsed}. Your best bar landed ${best?.dmg ?? 0} damage. ` +
      `Ended ${aHp} HP to their ${bHp} HP over ${boutRounds} rounds.`;
    const before = { ...strat };
    const reflection = await reflect(ROSTER[learner].name, ROSTER[opp].name, ROSTER[opp].type, won, strat, summary, live);
    strat = reflection.strat;
    memory.push(reflection.note);
    if (memory.length > 6) memory.shift();

    yield {
      type: "reflect",
      round: r,
      note: reflection.note,
      strat: { ...strat },
      delta: {
        risk: strat.risk - before.risk,
        focus: strat.focus - before.focus,
        aggression: strat.aggression - before.aggression,
      },
      eloDelta,
      elo,
      won,
    };
  }

  yield { type: "done", elo, wins, losses };
}
