// Headless bout — runs a full battle server-side and returns the result + turns
// in one JSON response (no SSE pacing). Powers the autonomous league, where many
// bouts run back-to-back. Defaults to mock=1 so a season is fast and free.
import { battleEvents } from "@/lib/engine/battle";
import { readSide, hasExternalAgent } from "@/lib/engine/side-config";
import { ROSTER, TOPICS } from "@/lib/engine/roster";
import type { BattleEnd, BattleTurn } from "@/lib/types";
import { rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = rateLimit(req, "sim", 20, 60_000);
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
  // league defaults to mock for speed; pass mock=0 to spend real LLM calls.
  // a bout with a bring-your-own agent always runs real so the agent is invoked.
  const mock = q.get("mock") === "1" || (q.get("mock") !== "0" && !hasExternalAgent(sideA, sideB));

  const turns: BattleTurn[] = [];
  let end: BattleEnd | null = null;
  for await (const ev of battleEvents(aKey, bKey, topic, mock, seed, sideA, sideB)) {
    if (ev.type === "turn") turns.push(ev);
    else if (ev.type === "end") end = ev;
  }
  if (!end) return new Response("no result", { status: 500 });
  return Response.json({ topic, end, turns });
}
