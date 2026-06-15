// The autonomous league — runs ranked bouts on a schedule so the ladder moves
// "while you sleep". Triggered by Vercel Cron (see vercel.json). Protected by
// CRON_SECRET when set: Vercel sends it as `Authorization: Bearer <secret>`.
import { ensureSeeded, pickMatchup, runRankedBout } from "@/lib/server/ladder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BOUTS_PER_RUN = 4;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
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
