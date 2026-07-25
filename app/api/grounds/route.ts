// Live population for the Tower / plaza — scene-budgeted, not the full dex.
import { SCENE_GROUNDS_AGENT_LIMIT } from "@/lib/scene-population";
import { getTowerAgents } from "@/lib/server/tower";
import { isShared } from "@/lib/server/store";
import type { TowerResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const asked = Number(new URL(req.url).searchParams.get("limit"));
  const limit = Math.min(
    SCENE_GROUNDS_AGENT_LIMIT,
    Number.isFinite(asked) && asked > 0 ? asked : SCENE_GROUNDS_AGENT_LIMIT,
  );
  const agents = await getTowerAgents(limit);
  const body: TowerResponse = { shared: isShared(), agents };
  return Response.json(body);
}
