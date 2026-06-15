import { NextResponse } from "next/server";
import { ROSTER } from "@/lib/engine/roster";
import { dailyPlan } from "@/lib/server/daily";
import type { DailyResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const p = dailyPlan();
  const entry = (key: string) => ({ key, name: ROSTER[key].name, type: ROSTER[key].type, persona: ROSTER[key].persona });
  const data: DailyResponse = {
    day: p.day,
    date: p.date,
    topic: p.topic,
    seed: p.seed,
    a: entry(p.aKey),
    b: entry(p.bKey),
  };
  return NextResponse.json(data);
}
