// Live bout feed — the "always on" league activity, now genuinely shared.
import { getFeed } from "@/lib/server/ladder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limit = Math.min(60, Number(new URL(req.url).searchParams.get("limit")) || 20);
  const feed = await getFeed(limit);
  return Response.json({ feed });
}
