// Send one of YOUR champions into a ranked bout against a random ladder
// opponent. Updates the shared ELO + feed and returns the result.
import { challengeChampion } from "@/lib/server/ladder";
import { rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const limited = rateLimit(req, "challenge", 10, 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const id = typeof b.id === "string" ? b.id : "";
  const ownerToken = typeof b.ownerToken === "string" ? b.ownerToken : "";
  if (!id) return Response.json({ error: "missing champion id" }, { status: 400 });
  if (!ownerToken || ownerToken.length < 8) {
    return Response.json({ error: "missing owner token" }, { status: 400 });
  }
  const result = await challengeChampion(id, ownerToken);
  if (!result) return Response.json({ error: "champion not found or not yours" }, { status: 404 });
  if ("error" in result) return Response.json(result, { status: 403 });
  return Response.json({ result });
}
