// Client behaviour pings. Accepts only the small set of events the browser is
// the source of truth for (session/return, entering the Grounds, the Daily, a
// render error) — every other metric is recorded server-side in the
// authoritative game path, so it can't be inflated from here. Aggregate counts
// only; no per-user trail is stored. Rate-limited per IP.
import { track, type ZEvent } from "@/lib/server/track";
import { rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The allowlist: events a client is permitted to report. Server-authoritative
// events (claim/bout/train/earn/spend/…) are deliberately excluded.
const CLIENT_EVENTS = new Set<ZEvent>(["session", "new_user", "return", "daily", "explore", "error"]);

export async function POST(req: Request) {
  const limited = rateLimit(req, "track", 120, 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const type = String(b.type || "") as ZEvent;
  if (!CLIENT_EVENTS.has(type)) return Response.json({ ok: false }, { status: 400 });

  const raw = typeof b.ownerToken === "string" ? b.ownerToken : "";
  const token = raw.length >= 8 && raw.length <= 128 ? raw : undefined;

  await track(type, token, 1);
  return Response.json({ ok: true });
}
