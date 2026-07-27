// Server-authoritative wallet (online-first). The Crown balance lives in the
// store, NOT in the client save blob, so a forged save can't touch it. Every
// earn/spend flows through here: the server decides fixed amounts itself, clamps
// variable client-reported earns to ceilings, and rejects overdraft. Betting is
// commit-reveal — the stake is taken HERE before the bout, and settled by the
// engine-authoritative path (lib/server/ladder.ts) once the outcome is known.
//
// Anti-abuse: variable earns require a claimId (one-shot per day/season); gauntlet
// also has a per-day payout count; Flight milestones (Hundred / first-light) use
// server-decided amounts outside the daily soft-trust cap; fragment_sell debits a
// server fragment balance that only fragment_buy credits.
import { getStore } from "@/lib/server/store";
import { rateLimit } from "@/lib/server/rate-limit";
import { track } from "@/lib/server/track";
import { currentSeasonNumber } from "@/lib/lore/season";
import { milestoneCrowns } from "@/lib/climb-campaign";
import {
  DAILY_VARIABLE_EARN_CAP,
  MAX_GAUNTLET_PAYOUTS_PER_DAY,
  MILESTONE_MAX,
  isLegalBet,
  walletDelta,
  type WalletEventType,
} from "@/lib/economy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const utcDay = () => Math.floor(Date.now() / 86_400_000);

function validToken(t: string): boolean {
  return t.length >= 8 && t.length <= 128;
}

function validClaimId(id: string): boolean {
  return /^[a-zA-Z0-9_.:-]{2,64}$/.test(id);
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!validToken(token)) return Response.json({ balance: 0 });
  const balance = await getStore().getWallet(token);
  return Response.json({ balance });
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "wallet", 60, 60_000);
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

  // Fragment buy: Crowns out, server fragment inventory in.
  if (type === "fragment_buy") {
    const delta = walletDelta("fragment_buy");
    if (delta === null) return Response.json({ error: "unknown event" }, { status: 400 });
    const r = await store.adjustWallet(token, delta);
    if (!r.ok) return Response.json({ ok: false, balance: r.balance });
    await store.adjustFragments(token, 1);
    void track("spend", token, -delta);
    return Response.json({ ok: true, balance: r.balance });
  }

  // Fragment sell: only if the server holds a fragment (client inventory alone is not enough).
  if (type === "fragment_sell") {
    const frag = await store.adjustFragments(token, -1);
    if (!frag.ok) return Response.json({ ok: false, balance: await store.getWallet(token), error: "no fragment" }, { status: 409 });
    const delta = walletDelta("fragment_sell");
    if (delta === null || delta <= 0) {
      await store.adjustFragments(token, 1);
      return Response.json({ error: "unknown event" }, { status: 400 });
    }
    const r = await store.adjustWallet(token, delta);
    if (!r.ok) {
      await store.adjustFragments(token, 1);
      return Response.json({ ok: false, balance: r.balance });
    }
    void track("earn", token, delta);
    return Response.json({ ok: true, balance: r.balance });
  }

  // Flight milestones: server decides Crowns from an allowlisted claimId.
  // One-shot per owner for the career (long TTL). Outside the daily soft-trust cap
  // so the Hundred purse (2500) is not clamped by GAUNTLET_MAX / day earn.
  if (type === "milestone") {
    const claimId = typeof b.claimId === "string" ? b.claimId.trim() : "";
    if (!validClaimId(claimId)) {
      return Response.json({ error: "missing or invalid claimId" }, { status: 400 });
    }
    const raw = milestoneCrowns(claimId);
    if (raw == null || raw <= 0) {
      return Response.json({ error: "unknown milestone" }, { status: 400 });
    }
    const delta = Math.min(MILESTONE_MAX, Math.round(raw));
    const scopeKey = `milestone:${token}:${claimId}`;
    const claimed = await store.claimOnce(scopeKey, 400 * 86_400);
    if (!claimed) {
      return Response.json({ ok: false, balance: await store.getWallet(token), error: "already claimed" }, { status: 409 });
    }
    const r = await store.adjustWallet(token, delta);
    if (r.ok) void track("earn", token, delta);
    return Response.json({ ok: r.ok, balance: r.balance, credited: delta });
  }

  // Variable earns: claimId + daily crown cap (+ gauntlet payout count).
  if (type === "cache" || type === "goal" || type === "gauntlet") {
    const claimId = typeof b.claimId === "string" ? b.claimId.trim() : "";
    if (!validClaimId(claimId)) {
      return Response.json({ error: "missing or invalid claimId" }, { status: 400 });
    }
    const delta = walletDelta(type as WalletEventType, Number(b.amount));
    if (delta === null || delta <= 0) return Response.json({ error: "invalid amount" }, { status: 400 });

    const day = utcDay();
    const season = currentSeasonNumber();
    const scopeKey =
      type === "goal"
        ? `goal:${season}:${token}:${claimId}`
        : type === "cache"
          ? `cache:${day}:${token}:${claimId}`
          : `gauntlet:${day}:${token}:${claimId}`;
    const ttl = type === "goal" ? 40 * 86_400 : 2 * 86_400;
    const claimed = await store.claimOnce(scopeKey, ttl);
    if (!claimed) {
      return Response.json({ ok: false, balance: await store.getWallet(token), error: "already claimed" }, { status: 409 });
    }

    if (type === "gauntlet") {
      const n = await store.incrGauntletPayout(token, day);
      if (n > MAX_GAUNTLET_PAYOUTS_PER_DAY) {
        return Response.json({ ok: false, balance: await store.getWallet(token), error: "gauntlet daily limit" }, { status: 429 });
      }
    }

    const earned = await store.incrDailyEarn(token, day, delta);
    if (earned > DAILY_VARIABLE_EARN_CAP) {
      // undo the counter so a later smaller claim can still land under the cap
      await store.incrDailyEarn(token, day, -delta);
      return Response.json({ ok: false, balance: await store.getWallet(token), error: "daily earn cap" }, { status: 429 });
    }

    const r = await store.adjustWallet(token, delta);
    if (r.ok) {
      void (async () => {
        await track("earn", token, delta);
        if (type === "cache") await track("node", token);
        else if (type === "goal") await track("goal", token);
      })();
    }
    return Response.json({ ok: r.ok, balance: r.balance });
  }

  const delta = walletDelta(type as WalletEventType, Number(b.amount));
  if (delta === null) return Response.json({ error: "unknown event" }, { status: 400 });

  const r = await store.adjustWallet(token, delta);

  if (r.ok) {
    void (async () => {
      if (delta < 0) await track("spend", token, -delta);
      else if (delta > 0) await track("earn", token, delta);
      if (type === "train") await track("train", token);
    })();
  }

  return Response.json({ ok: r.ok, balance: r.balance });
}
