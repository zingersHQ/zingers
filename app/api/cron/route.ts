// The autonomous league — runs ranked bouts on a schedule so the ladder moves
// "while you sleep". Triggered by Vercel Cron (see vercel.json). Protected by
// CRON_SECRET when set: Vercel sends it as `Authorization: Bearer <secret>`.
import { ensureSeeded, pickMatchup, runRankedBout } from "@/lib/server/ladder";
import { withinDailyBudget } from "@/lib/server/cost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Throttle the autonomous League without a redeploy. LEAGUE_BOUTS_PER_RUN tunes
// how hard each cron tick pushes; the daily LLM budget (cost.ts) hard-stops live
// spend when exceeded so a runaway season can't quietly burn the bill.
const BOUTS_PER_RUN = Math.max(0, Math.min(50, Number(process.env.LEAGUE_BOUTS_PER_RUN ?? 4)));

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
  }

  if (!(await withinDailyBudget())) {
    return Response.json({ ran: 0, results: [], skipped: "daily LLM budget reached" });
  }

  await ensureSeeded();
  const results: { winner: string; loser: string; delta: number }[] = [];
  for (let i = 0; i < BOUTS_PER_RUN; i++) {
    const pair = await pickMatchup();
    if (!pair) break;
    const r = await runRankedBout(pair[0], pair[1]);
    if (r) results.push({ winner: r.winner, loser: r.loser, delta: r.delta });
  }
  return Response.json({ ran: results.length, results });
}
