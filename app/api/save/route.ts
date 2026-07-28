// Server-authoritative player save, keyed by the anonymous owner token. This is
// the foundation that promotes localStorage from the source of truth to a mere
// cache: a legend now survives a cache wipe and follows the trainer across
// devices. No auth — the unguessable token IS the identity (same model as the
// rest of the app). We never persist model API keys; sanitizeSave strips them.
//
// Collection roster membership is union-merged into a Redis set on every read/
// write so last-write-wins on the blob cannot drop a recruit paid (or claimed)
// on another device. Paid recruits also land atomically via /api/wallet.
import { getStore, sanitizeSave, syncAuthoritativeRoster } from "@/lib/server/store";
import { rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validToken(t: string): boolean {
  return t.length >= 8 && t.length <= 128;
}

function sameRoster(a: string[] | undefined, b: string[]): boolean {
  const left = a ?? [];
  if (left.length !== b.length) return false;
  const set = new Set(left);
  return b.every((k) => set.has(k));
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!validToken(token)) return Response.json({ save: null });
  const store = getStore();
  const save = await store.getSave(token);
  if (!save) return Response.json({ save: null });
  const roster = await syncAuthoritativeRoster(store, token, save.roster ?? [], save.owned);
  const next = { ...save, roster };
  // Keep the blob mirror honest, but do not bump updatedAt — a roster union must
  // never win last-write-wins over a fresher career edit on another device.
  if (!sameRoster(save.roster, roster)) {
    await store.putSave(token, next);
  }
  return Response.json({ save: next });
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

  const store = getStore();
  const roster = await syncAuthoritativeRoster(store, ownerToken, save.roster, save.owned);
  const next = { ...save, roster };
  await store.putSave(ownerToken, next);
  return Response.json({ ok: true, updatedAt: next.updatedAt, roster });
}
