import { battleEvents, type BattleOpts } from "@/lib/engine/battle";
import { readSide, hasExternalAgent } from "@/lib/engine/side-config";
import { KEY } from "@/lib/engine/xai";
import { ROSTER, TOPICS, forceBiasMap } from "@/lib/engine/roster";
import { FOUNDING_REGIONS } from "@/lib/lore/canon";
import { sseStream } from "@/lib/sse-server";
import { rateLimit } from "@/lib/server/rate-limit";
import { withinDailyBudget } from "@/lib/server/cost";
import { recordGroundsBout } from "@/lib/server/ladder";
import type { BattleEvent, CreatureType } from "@/lib/types";

const FORCES: CreatureType[] = ["LOGIC", "CHAOS", "COMPOSURE", "RHETORIC", "CREATIVITY"];
function asForce(v: string | null): CreatureType | null {
  return v && (FORCES as string[]).includes(v) ? (v as CreatureType) : null;
}

/** Resolve home-advantage region bias from a world/region id — never trust client `bias`. */
function regionBiasFromWorld(worldOrRegion: string | null): CreatureType | null {
  if (!worldOrRegion) return null;
  const id = worldOrRegion.toLowerCase();
  // world ids from WORLDS → canon region ids
  const regionId = id === "grounds" ? "colosseum" : id === "gauntlet" ? "wastes" : id === "void" ? "garden" : id;
  return FOUNDING_REGIONS.find((r) => r.id === regionId)?.bias ?? null;
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
  const sideA = readSide(q, "a");
  const sideB = readSide(q, "b");

  const token = q.get("tok");
  const oppId = q.get("oid");
  const wantsRanked = q.get("rank") === "1" && !!token && !!oppId;

  // Ranked fights: never mock, never attacker-chosen seed, never client force bias.
  if (wantsRanked) {
    if (q.get("mock") === "1") {
      return Response.json({ error: "ranked fights cannot use mock mode" }, { status: 400 });
    }
    if (!KEY && !hasExternalAgent(sideA, sideB)) {
      return Response.json({ error: "ranked fights require a live brain" }, { status: 503 });
    }
  }

  // real by default (if the house has a key); only mock if forced (unranked), or if
  // there's no key AND nobody brought their own agent
  let mock = !wantsRanked && (q.get("mock") === "1" || (!KEY && !hasExternalAgent(sideA, sideB)));
  if (wantsRanked) mock = false;

  // Over daily LLM budget: unranked falls back to free mock; ranked refuses so
  // ELO/Crowns can't be farmed on a deterministic mock outcome.
  if (!mock && KEY) {
    const ok = await withinDailyBudget();
    if (!ok) {
      if (wantsRanked) {
        return Response.json({ error: "daily LLM budget reached — try again tomorrow" }, { status: 503 });
      }
      mock = true;
    }
  }

  // Unranked may take a client seed (daily/tribunal reproducibility). Ranked ignores it.
  const seedRaw = q.get("seed");
  const seed = wantsRanked ? null : seedRaw && /^\d+$/.test(seedRaw) ? Number(seedRaw) : null;

  // Tribunal: the player (side A) holds an ASSIGNED stance, and the room carries a
  // scenario-driven force-bias. Both default to the arena's own behaviour when
  // absent, so a plain duel is unchanged.
  const opts: BattleOpts = {};
  const saRaw = q.get("sa");
  if (saRaw === "for" || saRaw === "against") opts.stanceA = saRaw;
  const fav = asForce(q.get("fav"));
  const pun = asForce(q.get("pun"));
  if (fav && pun) opts.forceBias = forceBiasMap(fav, pun);
  opts.locale = q.get("lang") || undefined;

  let gen = battleEvents(aKey, bKey, topic, mock, seed, sideA, sideB, opts);

  // Ranked bout: side A is the player, oid is the opponent's ladder id. Recording
  // is what makes the 3D world feed the one global ladder.
  if (wantsRanked && token && oppId) {
    const regionBias = regionBiasFromWorld(q.get("world") || q.get("region"));
    gen = recordOnEnd(gen, {
      token,
      myKey: aKey,
      oppId,
      topic,
      handle: q.get("h") || undefined,
      strat: sideA.strat,
      betNonce: q.get("bet") || undefined,
      regionBias,
    });
  }

  return sseStream(gen);
}
