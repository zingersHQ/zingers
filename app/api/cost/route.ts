// Measured house LLM spend today + a monthly projection at a given scale. Admin
// surface for the "model real costs" discipline. Protected by CRON_SECRET when
// set (same gate as the cron). Query: ?dau=&bpp=&league= to size the projection.
import { getDailyCost, projectMonthly } from "@/lib/server/cost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
  }

  const q = new URL(req.url).searchParams;
  const num = (k: string, d: number) => {
    const v = Number(q.get(k));
    return Number.isFinite(v) && v >= 0 ? v : d;
  };

  const today = await getDailyCost();
  const projection = await projectMonthly({
    dau: num("dau", 1000),
    boutsPerPlayerPerDay: num("bpp", 5),
    leagueBoutsPerDay: num("league", 2000),
  });

  return Response.json({ today, projection });
}
