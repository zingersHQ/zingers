// Live population for the Tower: every perched agent + its derived status.
import { getTowerAgents } from "@/lib/server/tower";
import { isShared } from "@/lib/server/store";
import type { TowerResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limit = Math.min(60, Number(new URL(req.url).searchParams.get("limit")) || 40);
  const agents = await getTowerAgents(limit);
  const body: TowerResponse = { shared: isShared(), agents };
  return Response.json(body);
}
