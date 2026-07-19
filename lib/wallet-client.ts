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

/** Don't block gameplay on a hung wallet round-trip — fall back to local mirror. */
const WALLET_TIMEOUT_MS = 5_000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), WALLET_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function post(body: Record<string, unknown>): Promise<WalletResp | null> {
  const token = getOwnerToken();
  if (!token) return null;
  try {
    const r = await fetchWithTimeout("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerToken: token, ...body }),
      keepalive: true,
    });
    if (!r.ok) {
      // 409 already-claimed / no fragment — still return balance when present
      try {
        const j = (await r.json()) as Partial<WalletResp>;
        if (typeof j.balance === "number") return { ok: false, balance: j.balance };
      } catch {
        /* ignore */
      }
      return null;
    }
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
    const r = await fetchWithTimeout(`/api/wallet?token=${encodeURIComponent(token)}`);
    if (!r.ok) return null;
    const { balance } = (await r.json()) as { balance?: number };
    return typeof balance === "number" ? balance : null;
  } catch {
    return null;
  }
}

export function walletEvent(type: WalletEventType, amount?: number, claimId?: string): Promise<WalletResp | null> {
  return post({ type, amount, ...(claimId ? { claimId } : {}) });
}

export function commitBet(stake: number, side: "me" | "opp", nonce: string): Promise<WalletResp | null> {
  return post({ type: "bet_commit", amount: stake, side, nonce });
}
