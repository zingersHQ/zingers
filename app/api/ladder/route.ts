// Shared global ladder — the ONE leaderboard every visitor sees.
import { getLadder } from "@/lib/server/ladder";
import { isShared } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limit = Math.min(100, Number(new URL(req.url).searchParams.get("limit")) || 50);
  const champions = await getLadder(limit);
  return Response.json({ shared: isShared(), champions });
}
