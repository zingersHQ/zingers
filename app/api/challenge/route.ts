// Send one of your champions into a ranked bout against a random ladder
// opponent. Updates the shared ELO + feed and returns the result.
import { challengeChampion } from "@/lib/server/ladder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const id = typeof (body as Record<string, unknown>)?.id === "string" ? (body as Record<string, string>).id : "";
  if (!id) return Response.json({ error: "missing champion id" }, { status: 400 });
  const result = await challengeChampion(id);
  if (!result) return Response.json({ error: "champion not found" }, { status: 404 });
  return Response.json({ result });
}
