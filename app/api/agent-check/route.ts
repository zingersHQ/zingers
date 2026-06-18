// Smoke-test a bring-your-own agent endpoint BEFORE it enters the league. We
// POST a representative AgentView (exactly the shape a real bout sends) and check
// the response is a well-formed AgentDecision picking a legal move. Returns
// latency + the decision so a handler (or an MCP client) gets instant feedback.
import type { AgentView } from "@/lib/engine/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SAMPLE: AgentView = {
  topic: "cereal is soup",
  round: 3,
  arena: "THE TRIBUNAL (a mock courtroom arguing to a jury)",
  you: {
    name: "AXIOM",
    type: "LOGIC",
    persona: "a cold, precise logician who treats every argument as a proof to close",
    stance: "against",
    hp: 72,
    max: 100,
    statuses: "none",
  },
  opponent: {
    name: "VOX",
    type: "RHETORIC",
    hp: 64,
    max: 100,
    statuses: "exposed",
    lastLine: "Forget definitions: the warm bowl, the morning light. That feeling is soup.",
  },
  legalMoves: [
    { id: "syllogism", name: "Syllogism", desc: "id=syllogism, LOG, pow 22, clean damage" },
    { id: "reductio", name: "Reductio", desc: "id=reductio, LOG, pow 18, applies Exposed" },
    { id: "cold_read", name: "Cold Read", desc: "id=cold_read, CMP, pow 8, self Guard (+10 def, 2 turns)" },
    { id: "checkmate", name: "Checkmate", desc: "id=checkmate, LOG, pow 28, FINISHER, opponent is open" },
  ],
  strat: { risk: 55, focus: 60, aggression: 50 },
  memory: ["lost to Rhetoric when I hoarded the finisher, close earlier"],
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const endpoint = typeof (body as Record<string, unknown>)?.endpoint === "string" ? (body as Record<string, string>).endpoint : "";
  if (!endpoint) return Response.json({ ok: false, error: "missing endpoint" }, { status: 400 });

  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(SAMPLE),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const ms = Date.now() - t0;
    if (!res.ok) return Response.json({ ok: false, error: `agent returned HTTP ${res.status}`, ms });

    const out = (await res.json().catch(() => null)) as { move?: unknown; intent?: unknown; line?: unknown; why?: unknown } | null;
    const valid = !!out && typeof out.move === "string" && typeof out.line === "string" && out.move.length > 0 && out.line.length > 0;
    if (!valid) return Response.json({ ok: false, error: "response missing a valid {move, line}", ms });

    const moveValid = SAMPLE.legalMoves.some((m) => m.id === out!.move);
    return Response.json({
      ok: true,
      moveValid,
      ms,
      decision: {
        move: String(out!.move),
        intent: typeof out!.intent === "string" ? out!.intent : "",
        line: String(out!.line),
        why: typeof out!.why === "string" ? out!.why : "",
      },
      ...(moveValid ? {} : { note: "responded, but the move id is not one of the legal moves, so the engine would fall back to its heuristic" }),
    });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "unreachable", ms: Date.now() - t0 });
  }
}
