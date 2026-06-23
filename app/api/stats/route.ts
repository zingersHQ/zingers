// Aggregate behaviour analytics for the 3D stat-town dashboard: active players
// (DAU/WAU/MAU), the core funnel, and a daily event series. Admin surface —
// gated by CRON_SECRET (same discipline as /api/cost) when it's set. The secret
// may arrive as `Authorization: Bearer <secret>` OR a `?key=` query param so the
// in-browser dashboard can pass it. With no CRON_SECRET set (local dev) it's open.
import { getAnalytics } from "@/lib/server/track";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authed(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const url = new URL(req.url);
  if (url.searchParams.get("key") === secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authed(req)) return new Response("unauthorized", { status: 401 });

  const q = new URL(req.url).searchParams;
  const d = Number(q.get("days"));
  const days = Number.isFinite(d) && d >= 1 && d <= 90 ? Math.floor(d) : 14;

  const data = await getAnalytics(days);
  return Response.json(data);
}
