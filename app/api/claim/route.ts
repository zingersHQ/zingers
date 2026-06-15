// Claim/register a champion onto the shared ladder, tied to an anonymous owner
// token (no auth). Brain is House Grok or a self-hosted HTTP webhook — we never
// store anyone's model API keys server-side.
import { claimChampion, ensureSeeded } from "@/lib/server/ladder";

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
  if (!ownerToken) return Response.json({ error: "missing owner token" }, { status: 400 });

  await ensureSeeded();
  const brainRaw = (b.brain ?? {}) as Record<string, unknown>;
  const result = await claimChampion({
    ownerToken,
    handle: typeof b.handle === "string" ? b.handle : undefined,
    key: typeof b.key === "string" ? b.key : "",
    name: typeof b.name === "string" ? b.name : undefined,
    brain:
      brainRaw.provider === "http" && typeof brainRaw.endpoint === "string"
        ? { provider: "http", endpoint: brainRaw.endpoint }
        : { provider: "grok" },
    strat: (b.strat ?? undefined) as { risk: number; focus: number; aggression: number } | undefined,
  });

  if ("error" in result) return Response.json(result, { status: 400 });
  return Response.json({ champion: result });
}
