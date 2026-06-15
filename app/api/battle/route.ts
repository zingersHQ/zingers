import { battleEvents } from "@/lib/engine/battle";
import { readSide, hasExternalAgent } from "@/lib/engine/side-config";
import { KEY } from "@/lib/engine/xai";
import { ROSTER, TOPICS } from "@/lib/engine/roster";
import { sseStream } from "@/lib/sse-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
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
  return sseStream(battleEvents(aKey, bKey, topic, mock, seed, sideA, sideB));
}
