import { houseEvents } from "@/lib/engine/house";
import { KEY } from "@/lib/engine/xai";
import { ROSTER } from "@/lib/engine/roster";
import { sseStream } from "@/lib/sse-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const roster = Object.keys(ROSTER);
  const castQ = q.get("cast");
  let cast = castQ ? castQ.split(",").map((k) => k.trim().toUpperCase()) : roster;
  cast = cast.filter((k) => ROSTER[k]);
  if (cast.length < 4) return new Response("need at least 4 creatures", { status: 400 });
  let traitors = Number(q.get("traitors") || "2");
  if (!Number.isFinite(traitors)) traitors = 2;
  traitors = Math.max(1, Math.min(traitors, Math.max(1, Math.floor((cast.length - 1) / 2))));
  const seedRaw = q.get("seed");
  const seed = seedRaw && /^\d+$/.test(seedRaw) ? Number(seedRaw) : null;
  const mock = q.get("mock") === "1" || !KEY;
  return sseStream(houseEvents(cast, traitors, mock, seed));
}
