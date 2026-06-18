// SSE stream of the self-improving agent loop. Defaults to mock bouts (fast and
// free); pass mock=0 to spend real LLM calls for live bouts + reflection.
import { sseStream } from "@/lib/sse-server";
import { autoplayRun } from "@/lib/server/autoplay";
import { ROSTER } from "@/lib/engine/roster";
import { rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = rateLimit(req, "autoplay", 6, 60_000);
  if (limited) return limited;
  const q = new URL(req.url).searchParams;
  const a = (q.get("a") || "AXIOM").toUpperCase();
  if (!ROSTER[a]) return new Response("unknown creature", { status: 400 });
  const rounds = Math.max(1, Math.min(8, Number(q.get("rounds")) || 6));
  const mock = q.get("mock") !== "0";
  const seedRaw = q.get("seed");
  const seed = seedRaw && /^\d+$/.test(seedRaw) ? Number(seedRaw) : null;
  return sseStream(autoplayRun(a, rounds, mock, seed));
}
