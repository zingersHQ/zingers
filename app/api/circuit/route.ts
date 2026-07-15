import { getCircuitBoard, submitCircuitRun, isCircuitShared, type CircuitBody } from "@/lib/server/circuit";
import { rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MS = 90 * 60 * 1000; // must match lib/server/circuit MAX_MS

function parseBody(v: string | null | undefined): CircuitBody {
  return v === "flight" ? "flight" : "thumb"; // default thumb (back-compat)
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const limit = Math.min(50, Number(q.get("limit")) || 20);
  const token = q.get("token") || undefined;
  const body = parseBody(q.get("body"));
  const board = await getCircuitBoard(limit, token, body);
  return Response.json({ ...board, shared: isCircuitShared() });
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "circuit", 30, 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const token = typeof b.token === "string" ? b.token.trim() : "";
  if (token.length < 8 || token.length > 128) return new Response("bad token", { status: 400 });

  const sectors = Number(b.sectors);
  const totalMs = Number(b.totalMs);
  if (!Number.isFinite(sectors) || sectors < 0 || sectors > 100) return new Response("bad sectors", { status: 400 });
  if (!Number.isFinite(totalMs) || totalMs < 0 || totalMs > MAX_MS) return new Response("bad time", { status: 400 });

  const handle = typeof b.handle === "string" ? b.handle : "";
  const clearedAll = b.clearedAll === true;
  const runBody = parseBody(typeof b.body === "string" ? b.body : null);

  const result = await submitCircuitRun(token, handle, sectors, totalMs, clearedAll, runBody);
  return Response.json(result);
}
