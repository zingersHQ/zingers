// Retune one of your champions between bouts — adjust its doctrine dials and/or
// swap its brain (House Grok ↔ bring-your-own HTTP agent). Owner-token gated; we
// never store anyone's model API keys server-side.
import { trainChampion } from "@/lib/server/ladder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const ownerToken = typeof b.ownerToken === "string" ? b.ownerToken : "";
  const id = typeof b.id === "string" ? b.id : "";
  if (!ownerToken) return Response.json({ error: "missing owner token" }, { status: 400 });
  if (!id) return Response.json({ error: "missing champion id" }, { status: 400 });

  const brainRaw = (b.brain ?? null) as Record<string, unknown> | null;
  const result = await trainChampion({
    ownerToken,
    id,
    strat: (b.strat ?? undefined) as Partial<{ risk: number; focus: number; aggression: number }> | undefined,
    brain: brainRaw
      ? brainRaw.provider === "http" && typeof brainRaw.endpoint === "string"
        ? { provider: "http", endpoint: brainRaw.endpoint }
        : { provider: "grok" }
      : undefined,
  });

  if ("error" in result) return Response.json(result, { status: 400 });
  return Response.json({ champion: result });
}
