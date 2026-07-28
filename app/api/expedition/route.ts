import {
  getPublicExpeditionBoard,
  isExpeditionShared,
  submitExpeditionRun,
} from "@/lib/server/expedition";
import { EXPEDITION_SECTORS, expeditionWeekId } from "@/lib/expeditions";
import { rateLimit } from "@/lib/server/rate-limit";
import type { CircuitBody } from "@/lib/server/circuit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MS = 90 * 60 * 1000;

function parseBody(v: string | null | undefined): CircuitBody {
  return v === "flight" ? "flight" : "thumb";
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const limit = Math.min(50, Number(q.get("limit")) || 20);
  const token = q.get("token") || undefined;
  const body = parseBody(q.get("body"));
  const weekId = (q.get("week") || expeditionWeekId()).slice(0, 16);
  const board = await getPublicExpeditionBoard(weekId, limit, token, body);
  return Response.json({ ...board, shared: isExpeditionShared(), maxSectors: EXPEDITION_SECTORS });
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "expedition", 30, 60_000);
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

  const weekId = (typeof b.weekId === "string" ? b.weekId : expeditionWeekId()).slice(0, 16);
  const sectors = Number(b.sectors);
  const totalMs = Number(b.totalMs);
  if (!Number.isFinite(sectors) || sectors < 0 || sectors > EXPEDITION_SECTORS) {
    return new Response("bad sectors", { status: 400 });
  }
  if (!Number.isFinite(totalMs) || totalMs < 0 || totalMs > MAX_MS) {
    return new Response("bad time", { status: 400 });
  }

  const runBody = parseBody(typeof b.body === "string" ? b.body : null);
  const runId = typeof b.runId === "string" ? b.runId : undefined;
  const result = await submitExpeditionRun(token, weekId, sectors, totalMs, runBody, runId);
  return Response.json(result);
}
