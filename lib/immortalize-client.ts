"use client";
// Thin client for Immortalize status / voucher / prepare / confirm.
import { getOwnerToken } from "@/lib/owner";
import type { ImmortalRecord, ImmortalStatus, ImmortalVoucher } from "@/lib/immortalize";

const TIMEOUT_MS = 8_000;
const CHAIN_TIMEOUT_MS = 45_000;

async function fetchWithTimeout(url: string, init?: RequestInit, ms = TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchImmortalStatus(mindKey: string): Promise<ImmortalStatus | null> {
  const token = getOwnerToken();
  if (!token) return null;
  try {
    const r = await fetchWithTimeout(
      `/api/immortalize?token=${encodeURIComponent(token)}&mind=${encodeURIComponent(mindKey)}`,
    );
    if (!r.ok) return null;
    return (await r.json()) as ImmortalStatus;
  } catch {
    return null;
  }
}

export async function requestImmortalVoucher(
  mindKey: string,
): Promise<{ ok: true; voucher: ImmortalVoucher; message: string } | { ok: false; error: string }> {
  const token = getOwnerToken();
  if (!token) return { ok: false, error: "no_wallet" };
  try {
    const r = await fetchWithTimeout("/api/immortalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "voucher", token, mind: mindKey }),
    });
    const j = (await r.json()) as {
      ok?: boolean;
      voucher?: ImmortalVoucher;
      message?: string;
      error?: string;
    };
    if (!r.ok || !j.voucher || !j.message) {
      return { ok: false, error: j.error || "not_eligible" };
    }
    return { ok: true, voucher: j.voucher, message: j.message };
  } catch {
    return { ok: false, error: "Network error." };
  }
}

export async function prepareImmortalTx(opts: {
  voucherId: string;
  signature: string;
  message: string;
}): Promise<
  | {
      ok: true;
      txBase64: string;
      mint: string;
      burnRaw: string;
      fuelMint: string;
      fuelSymbol: string;
    }
  | { ok: false; error: string }
> {
  const token = getOwnerToken();
  if (!token) return { ok: false, error: "no_wallet" };
  try {
    const r = await fetchWithTimeout(
      "/api/immortalize",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "prepare", token, ...opts }),
      },
      CHAIN_TIMEOUT_MS,
    );
    const j = (await r.json()) as {
      ok?: boolean;
      txBase64?: string;
      mint?: string;
      burnRaw?: string;
      fuelMint?: string;
      fuelSymbol?: string;
      error?: string;
    };
    if (!r.ok || !j.txBase64 || !j.mint) return { ok: false, error: j.error || "prepare_missing" };
    return {
      ok: true,
      txBase64: j.txBase64,
      mint: j.mint,
      burnRaw: j.burnRaw || "0",
      fuelMint: j.fuelMint || "",
      fuelSymbol: j.fuelSymbol || "CARS",
    };
  } catch {
    return { ok: false, error: "Network error." };
  }
}

/** Submit a wallet-signed tx through our API (server uses SOLANA_RPC_URL). */
export async function broadcastImmortalTx(
  txBase64: string,
): Promise<{ ok: true; signature: string } | { ok: false; error: string }> {
  const token = getOwnerToken();
  if (!token) return { ok: false, error: "no_wallet" };
  try {
    const r = await fetchWithTimeout(
      "/api/immortalize",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "broadcast", token, txBase64 }),
      },
      CHAIN_TIMEOUT_MS,
    );
    const j = (await r.json()) as { ok?: boolean; signature?: string; error?: string };
    if (!r.ok || !j.signature) return { ok: false, error: j.error || "tx_failed" };
    return { ok: true, signature: j.signature };
  } catch {
    return { ok: false, error: "Network error." };
  }
}

export async function confirmImmortalClient(opts: {
  voucherId: string;
  signature: string;
  message: string;
  txSig?: string;
}): Promise<{ ok: true; record: ImmortalRecord } | { ok: false; error: string }> {
  const token = getOwnerToken();
  if (!token) return { ok: false, error: "no_wallet" };
  try {
    const r = await fetchWithTimeout(
      "/api/immortalize",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", token, ...opts }),
      },
      CHAIN_TIMEOUT_MS,
    );
    const j = (await r.json()) as { ok?: boolean; record?: ImmortalRecord; error?: string };
    if (!r.ok || !j.record) return { ok: false, error: j.error || "Confirm failed." };
    return { ok: true, record: j.record };
  } catch {
    return { ok: false, error: "Network error." };
  }
}
