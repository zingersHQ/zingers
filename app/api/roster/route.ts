import { NextResponse } from "next/server";
import { ROSTER, TOPICS } from "@/lib/engine/roster";
import type { RosterResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const data: RosterResponse = {
    creatures: Object.entries(ROSTER).map(([key, c]) => ({ key, name: c.name, type: c.type, persona: c.persona })),
    topics: TOPICS,
  };
  return NextResponse.json(data);
}
