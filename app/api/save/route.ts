// Server-authoritative player save, keyed by the anonymous owner token. This is
// the foundation that promotes localStorage from the source of truth to a mere
// cache: a legend now survives a cache wipe and follows the trainer across
// devices. No auth — the unguessable token IS the identity (same model as the
// rest of the app). We never persist model API keys; sanitizeSave strips them.
import { getStore, sanitizeSave } from "@/lib/server/store";
import { rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validToken(t: string): boolean {
  return t.length >= 8 && t.length <= 128;
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!validToken(token)) return Response.json({ save: null });
  const save = await getStore().getSave(token);
  return Response.json({ save });
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "save", 60, 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const ownerToken = typeof b.ownerToken === "string" ? b.ownerToken : "";
  if (!validToken(ownerToken)) return Response.json({ error: "missing or invalid owner token" }, { status: 400 });

  const save = sanitizeSave(b.save);
  if (!save) return Response.json({ error: "invalid save" }, { status: 400 });

  await getStore().putSave(ownerToken, save);
  return Response.json({ ok: true, updatedAt: save.updatedAt });
}
