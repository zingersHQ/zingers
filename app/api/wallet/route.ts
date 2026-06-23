// Server-authoritative wallet (online-first). The Crown balance lives in the
// store, NOT in the client save blob, so a forged save can't touch it. Every
// earn/spend flows through here: the server decides fixed amounts itself, clamps
// variable client-reported earns to ceilings, and rejects overdraft. Betting is
// commit-reveal — the stake is taken HERE before the bout, and settled by the
// engine-authoritative path (lib/server/ladder.ts) once the outcome is known.
import { getStore } from "@/lib/server/store";
import { rateLimit } from "@/lib/server/rate-limit";
import { track } from "@/lib/server/track";
import { isLegalBet, walletDelta, type WalletEventType } from "@/lib/economy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validToken(t: string): boolean {
  return t.length >= 8 && t.length <= 128;
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!validToken(token)) return Response.json({ balance: 0 });
  const balance = await getStore().getWallet(token);
  return Response.json({ balance });
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "wallet", 120, 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const token = typeof b.ownerToken === "string" ? b.ownerToken : "";
  if (!validToken(token)) return Response.json({ error: "missing or invalid owner token" }, { status: 400 });

  const type = String(b.type || "");
  const store = getStore();

  // Commit-reveal bet: stake taken now, settled by the bout. Refund any abandoned
  // wager first so a stale stake is never silently forfeited or double-counted.
  if (type === "bet_commit") {
    const stake = Number(b.amount);
    const side = b.side === "opp" ? "opp" : b.side === "me" ? "me" : null;
    const nonce = typeof b.nonce === "string" ? b.nonce : "";
    if (!side || !nonce || !isLegalBet(stake)) {
      return Response.json({ error: "invalid bet" }, { status: 400 });
    }
    const existing = await store.getPendingBet(token);
    if (existing) await store.adjustWallet(token, existing.stake);
    const r = await store.adjustWallet(token, -stake);
    if (!r.ok) {
      await store.clearPendingBet(token);
      return Response.json({ ok: false, balance: r.balance });
    }
    await store.setPendingBet(token, { stake, side, nonce, ts: Date.now() });
    await track("bet", token);
    return Response.json({ ok: true, balance: r.balance });
  }

  const delta = walletDelta(type as WalletEventType, Number(b.amount));
  if (delta === null) return Response.json({ error: "unknown event" }, { status: 400 });

  const r = await store.adjustWallet(token, delta);

  // Behaviour analytics (best-effort): economy flow + the action behind it.
  if (r.ok) {
    if (delta < 0) await track("spend", token, -delta);
    else if (delta > 0) await track("earn", token, delta);
    if (type === "train") await track("train", token);
    else if (type === "cache") await track("node", token);
    else if (type === "goal") await track("goal", token);
  }

  return Response.json({ ok: r.ok, balance: r.balance });
}
