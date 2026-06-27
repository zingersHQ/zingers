// Pre-launch waitlist capture. Stores deduped emails server-side (Upstash, with
// an in-memory fallback) and returns the running count so the landing page can
// show momentum. Rate-limited per IP so the list can't be flooded.
import { getStore } from "@/lib/server/store";
import { rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Deliberately permissive: catch obvious junk, don't reject valid-but-unusual
// addresses. Real verification happens when we actually email the list.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LEN = 254;
const MAX_REF_LEN = 64;

export async function POST(req: Request) {
  const limited = rateLimit(req, "waitlist", 8, 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const raw = (body as { email?: unknown })?.email;
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!email || email.length > MAX_EMAIL_LEN || !EMAIL_RE.test(email)) {
    return Response.json({ ok: false, error: "invalid email" }, { status: 400 });
  }
  const refRaw = (body as { ref?: unknown })?.ref;
  const ref = typeof refRaw === "string" ? refRaw.slice(0, MAX_REF_LEN) : "landing";

  try {
    const res = await getStore().addWaitlist(email, ref);
    return Response.json({ ok: true, isNew: res.isNew, count: res.count });
  } catch {
    return Response.json({ ok: false, error: "store unavailable" }, { status: 503 });
  }
}

export async function GET() {
  try {
    const count = await getStore().waitlistCount();
    return Response.json({ count });
  } catch {
    return Response.json({ count: 0 });
  }
}
