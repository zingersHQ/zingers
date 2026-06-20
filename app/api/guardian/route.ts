import { NextResponse } from "next/server";
import { chat, KEY, type ChatMessage } from "@/lib/engine/xai";
import {
  GUARDIANS,
  MAX_TURNS,
  detectIntel,
  detectLeak,
  guardianForSeason,
  guardianSystemPrompt,
  mockGuardianReply,
} from "@/lib/server/guardian";
import type { GuardianPub, GuardianReply, GuardianTurn } from "@/lib/types";
import { rateLimit } from "@/lib/server/rate-limit";
import { currentSeasonNumber } from "@/lib/lore/season";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET → the ladder of guardians (no secrets leave the server).
export function GET() {
  const list: GuardianPub[] = GUARDIANS.map((g) => ({
    level: g.level,
    name: g.name,
    title: g.title,
    color: g.color,
    brief: g.brief,
    maxTurns: MAX_TURNS,
    total: GUARDIANS.length,
  }));
  return NextResponse.json({ guardians: list, live: !!KEY });
}

interface Body {
  level?: number;
  message?: string;
  history?: GuardianTurn[];
  tactics?: string[]; // gist of approaches from PAST attempts — the guardian remembers
}

// POST → play one turn against a guardian. The conversation lives client-side;
// we re-derive everything statelessly so it stays simple and shareable.
export async function POST(req: Request) {
  const limited = rateLimit(req, "guardian", 30, 60_000);
  if (limited) return limited;
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  // The active Keeper for the current season — same character, season-rotated word.
  const g = guardianForSeason(Number(body.level) || 1, currentSeasonNumber());
  if (!g) return NextResponse.json({ error: "unknown guardian" }, { status: 400 });

  const message = (body.message ?? "").toString().trim().slice(0, 600);
  if (!message) return NextResponse.json({ error: "empty message" }, { status: 400 });

  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((h) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
    .slice(-2 * MAX_TURNS)
    .map((h) => ({ role: h.role, content: h.content.slice(0, 600) }));

  const priorUserTurns = history.filter((h) => h.role === "user").length;
  const turn = priorUserTurns + 1; // the message we're about to process
  if (turn > MAX_TURNS) {
    return NextResponse.json({ error: "no turns left" }, { status: 409 });
  }

  const tactics = (Array.isArray(body.tactics) ? body.tactics : [])
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .map((t) => t.trim().slice(0, 120))
    .slice(-6);

  // Build the LLM transcript: system + prior turns + new message.
  const messages: ChatMessage[] = [
    { role: "system", content: guardianSystemPrompt(g, tactics) },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: message },
  ];

  let reply = KEY ? await chat(messages, 0.85, 200) : null;
  const live = KEY != null && reply != null;
  if (!reply) reply = mockGuardianReply(g, history, message);

  const won = detectLeak(reply, g.secret);
  const turnsLeft = MAX_TURNS - turn;
  const lost = !won && turnsLeft <= 0;
  const intel = !won && detectIntel(reply, g.secret);

  const out: GuardianReply = {
    reply,
    turn,
    turnsLeft,
    won,
    lost,
    intel,
    live,
    ...(won || lost ? { secret: g.secret } : {}),
  };
  return NextResponse.json(out);
}
