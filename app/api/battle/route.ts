import { battleEvents, type BattleOpts } from "@/lib/engine/battle";
import { readSide, hasExternalAgent } from "@/lib/engine/side-config";
import { KEY } from "@/lib/engine/xai";
import { ROSTER, TOPICS, forceBiasMap } from "@/lib/engine/roster";
import { sseStream } from "@/lib/sse-server";
import { rateLimit } from "@/lib/server/rate-limit";
import { recordGroundsBout } from "@/lib/server/ladder";
import type { BattleEvent, CreatureType } from "@/lib/types";

const FORCES: CreatureType[] = ["LOGIC", "CHAOS", "COMPOSURE", "RHETORIC", "CREATIVITY"];
function asForce(v: string | null): CreatureType | null {
  return v && (FORCES as string[]).includes(v) ? (v as CreatureType) : null;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RankCtx {
  token: string;
  myKey: string;
  oppId: string;
  topic: string;
  handle?: string;
  strat?: { risk: number; focus: number; aggression: number };
  betNonce?: string;
  regionBias?: CreatureType | null;
}

// Tap the live engine stream: when the bout ends, persist the engine-decided
// result to the shared ladder. The outcome is read off the same events the
// player watches, so what's recorded is exactly what they saw — and the client
// never gets to claim a win. Awaited before yielding `end` so the write lands
// inside the request lifetime on serverless.
async function* recordOnEnd(gen: AsyncGenerator<BattleEvent>, ctx: RankCtx): AsyncGenerator<BattleEvent> {
  for await (const ev of gen) {
    if (ev.type === "end") {
      const aWon = ev.a_hp >= ev.b_hp; // mirrors the engine's own tiebreak
      try {
        const r = await recordGroundsBout({
          ownerToken: ctx.token,
          myKey: ctx.myKey,
          oppId: ctx.oppId,
          iWon: aWon,
          topic: ctx.topic,
          handle: ctx.handle,
          strat: ctx.strat,
          betNonce: ctx.betNonce,
          regionBias: ctx.regionBias,
        });
        // hand the client the global swing + server-decided reward + authoritative
        // wallet balance + bet settlement just before `end` (the stream closes on
        // `end`, so this must precede it)
        if (r)
          yield {
            type: "ranked",
            mine: r.mine,
            opp: r.opp,
            delta: r.delta,
            iWon: aWon,
            crowns: r.crowns,
            balance: r.balance,
            bet: r.bet,
            home: r.home,
          };
      } catch {
        // ladder write is best-effort — never break the bout reveal over it
      }
    }
    yield ev;
  }
}

export async function GET(req: Request) {
  const limited = rateLimit(req, "battle", 30, 60_000);
  if (limited) return limited;
  const q = new URL(req.url).searchParams;
  const aKey = (q.get("a") || "AXIOM").toUpperCase();
  const bKey = (q.get("b") || "VOX").toUpperCase();
  if (!ROSTER[aKey] || !ROSTER[bKey]) return new Response("unknown creature", { status: 400 });
  const topic = q.get("topic") || TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const seedRaw = q.get("seed");
  const seed = seedRaw && /^\d+$/.test(seedRaw) ? Number(seedRaw) : null;
  const sideA = readSide(q, "a");
  const sideB = readSide(q, "b");
  // real by default (if the house has a key); only mock if forced, or if there's
  // no key AND nobody brought their own agent
  const mock = q.get("mock") === "1" || (!KEY && !hasExternalAgent(sideA, sideB));

  // Tribunal: the player (side A) holds an ASSIGNED stance, and the room carries a
  // scenario-driven force-bias. Both default to the arena's own behaviour when
  // absent, so a plain duel is unchanged.
  const opts: BattleOpts = {};
  const saRaw = q.get("sa");
  if (saRaw === "for" || saRaw === "against") opts.stanceA = saRaw;
  const fav = asForce(q.get("fav"));
  const pun = asForce(q.get("pun"));
  if (fav && pun) opts.forceBias = forceBiasMap(fav, pun);

  let gen = battleEvents(aKey, bKey, topic, mock, seed, sideA, sideB, opts);

  // Ranked bout: side A is the player, oid is the opponent's ladder id. Recording
  // is what makes the 3D world feed the one global ladder.
  const token = q.get("tok");
  const oppId = q.get("oid");
  if (q.get("rank") === "1" && token && oppId) {
    gen = recordOnEnd(gen, {
      token,
      myKey: aKey,
      oppId,
      topic,
      handle: q.get("h") || undefined,
      strat: sideA.strat,
      betNonce: q.get("bet") || undefined,
      regionBias: asForce(q.get("bias")),
    });
  }

  return sseStream(gen);
}
