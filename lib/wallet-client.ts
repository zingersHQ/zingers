"use client";
// Thin client for the server-authoritative wallet. Every call returns the
// server's truth (balance) or null when the wallet is unreachable (offline / no
// token) — callers then fall back to an optimistic local mirror, which the next
// syncWallet() reconciles against the server (server wins).
import { getOwnerToken } from "@/lib/owner";
import type { WalletEventType } from "@/lib/economy";

export interface WalletResp {
  ok: boolean;
  balance: number;
}

async function post(body: Record<string, unknown>): Promise<WalletResp | null> {
  const token = getOwnerToken();
  if (!token) return null;
  try {
    const r = await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerToken: token, ...body }),
      keepalive: true,
    });
    if (!r.ok) return null;
    const j = (await r.json()) as Partial<WalletResp>;
    if (typeof j.balance !== "number") return null;
    return { ok: j.ok !== false, balance: j.balance };
  } catch {
    return null;
  }
}

export async function fetchBalance(): Promise<number | null> {
  const token = getOwnerToken();
  if (!token) return null;
  try {
    const r = await fetch(`/api/wallet?token=${encodeURIComponent(token)}`);
    if (!r.ok) return null;
    const { balance } = (await r.json()) as { balance?: number };
    return typeof balance === "number" ? balance : null;
  } catch {
    return null;
  }
}

export function walletEvent(type: WalletEventType, amount?: number): Promise<WalletResp | null> {
  return post({ type, amount });
}

export function commitBet(stake: number, side: "me" | "opp", nonce: string): Promise<WalletResp | null> {
  return post({ type: "bet_commit", amount: stake, side, nonce });
}
