"use client";
// Optional wallet identity — keep a Trainer name across devices. Never required
// to play. Sign-only; no spend UI; no vendor branding in the chrome.
import { useCallback, useEffect, useState } from "react";
import { Unplug, Wallet } from "lucide-react";
import bs58 from "bs58";
import { STORAGE } from "@/lib/brand";
import { getHandle, getOwnerToken, setHandle as persistHandle } from "@/lib/owner";
import { track as pingEvent } from "@/lib/track";

type WalletProvider = {
  publicKey?: { toBase58(): string };
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array, display?: "utf8" | "hex"): Promise<{ signature: Uint8Array }>;
};

function getWallet(): WalletProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { solana?: WalletProvider & { isPhantom?: boolean }; phantom?: { solana?: WalletProvider } };
  if (w.solana && typeof w.solana.signMessage === "function") return w.solana;
  if (w.phantom?.solana && typeof w.phantom.solana.signMessage === "function") return w.phantom.solana;
  return null;
}

function shortPk(pk: string) {
  return pk.length > 10 ? `${pk.slice(0, 4)}…${pk.slice(-4)}` : pk;
}

const ink = "var(--ink)";
const mute = "var(--muted2)";
const line = "var(--line2)";

export function SolanaConnect({
  compact = false,
  onIdentity,
}: {
  compact?: boolean;
  /** Fired when server restores or saves a name (parent can mirror into claim forms). */
  onIdentity?: (name: string | null) => void;
}) {
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const applyName = useCallback(
    (n: string | null) => {
      if (n) {
        setName(n);
        persistHandle(n);
        onIdentity?.(n);
      } else {
        onIdentity?.(null);
      }
    },
    [onIdentity],
  );

  const hydrate = useCallback(async () => {
    const token = getOwnerToken();
    if (!token) return;
    const localName = getHandle();
    if (localName) setName(localName);
    try {
      const local = localStorage.getItem(STORAGE.solPubkey);
      if (local) setPubkey(local);
      const r = await fetch(`/api/solana-link?token=${encodeURIComponent(token)}`);
      const j = (await r.json()) as { pubkey?: string | null; name?: string | null };
      if (j.pubkey) {
        setPubkey(j.pubkey);
        localStorage.setItem(STORAGE.solPubkey, j.pubkey);
      } else {
        setPubkey(null);
        localStorage.removeItem(STORAGE.solPubkey);
      }
      if (j.name) applyName(j.name);
    } catch {
      /* keep local */
    }
  }, [applyName]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const connect = useCallback(async () => {
    setErr(null);
    const wallet = getWallet();
    if (!wallet) {
      setErr("No wallet found in this browser.");
      return;
    }
    const token = getOwnerToken();
    if (!token) {
      setErr("No Trainer on this device.");
      return;
    }
    setBusy(true);
    try {
      const nr = await fetch(`/api/solana-link?token=${encodeURIComponent(token)}&nonce=1`);
      const nj = (await nr.json()) as { message?: string; error?: string };
      if (!nr.ok || !nj.message) throw new Error(nj.error || "Could not start.");

      await wallet.connect();
      const pk = wallet.publicKey?.toBase58();
      if (!pk) throw new Error("Wallet did not return a key.");

      const encoded = new TextEncoder().encode(nj.message);
      const { signature } = await wallet.signMessage(encoded, "utf8");
      const sigB58 = bs58.encode(signature);

      const pr = await fetch("/api/solana-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          pubkey: pk,
          signature: sigB58,
          message: nj.message,
          name: name.trim() || getHandle() || undefined,
        }),
      });
      const pj = (await pr.json()) as { ok?: boolean; pubkey?: string; name?: string | null; error?: string };
      if (!pr.ok || !pj.pubkey) throw new Error(pj.error || "Could not link.");

      setPubkey(pj.pubkey);
      localStorage.setItem(STORAGE.solPubkey, pj.pubkey);
      if (pj.name) applyName(pj.name);
      else if (name.trim()) persistHandle(name.trim());
      pingEvent("sol_link");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cancelled.");
    } finally {
      setBusy(false);
    }
  }, [name, applyName]);

  const saveName = useCallback(async () => {
    setErr(null);
    const token = getOwnerToken();
    if (!token || !pubkey) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setErr("Name needs at least 2 characters.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/solana-link", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: trimmed }),
      });
      const j = (await r.json()) as { ok?: boolean; name?: string; error?: string };
      if (!r.ok || !j.name) throw new Error(j.error || "Could not save.");
      applyName(j.name);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1400);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }, [name, pubkey, applyName]);

  const disconnect = useCallback(async () => {
    setErr(null);
    const token = getOwnerToken();
    setBusy(true);
    try {
      if (token) {
        await fetch(`/api/solana-link?token=${encodeURIComponent(token)}`, { method: "DELETE" });
      }
      try {
        await getWallet()?.disconnect();
      } catch {
        /* ignore */
      }
      localStorage.removeItem(STORAGE.solPubkey);
      setPubkey(null);
    } finally {
      setBusy(false);
    }
  }, []);

  if (compact && pubkey) {
    return (
      <div
        className="mono"
        title={name || pubkey}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 9px",
          borderRadius: 8,
          border: `1px solid ${line}`,
          background: "transparent",
          color: ink,
          fontSize: 10,
          letterSpacing: 0.3,
        }}
      >
        <Wallet size={11} strokeWidth={2} />
        {name || shortPk(pubkey)}
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "transparent",
    border: `1px solid ${line}`,
    borderRadius: 8,
    color: ink,
    padding: "8px 10px",
    fontFamily: "var(--font-mono), monospace",
    fontSize: 12,
  };

  const ghostBtn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontSize: 11,
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${line}`,
    background: "transparent",
    color: "var(--muted)",
    cursor: busy ? "wait" : "pointer",
    fontFamily: "var(--font-mono), monospace",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 1.8, color: "var(--muted)", marginBottom: 4 }}>
          YOUR NAME
        </div>
        <p className="mono" style={{ fontSize: 9, color: mute, lineHeight: 1.45, margin: "0 0 8px" }}>
          Optional. Connect once to keep it when you change devices.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 24))}
            onBlur={() => {
              if (name.trim().length >= 2) persistHandle(name.trim());
            }}
            placeholder="Trainer name"
            maxLength={24}
            style={inputStyle}
            aria-label="Trainer name"
          />
          {pubkey ? (
            <button type="button" onClick={() => void saveName()} disabled={busy} style={{ ...ghostBtn, color: ink, flexShrink: 0 }}>
              {savedFlash ? "saved" : "save"}
            </button>
          ) : null}
        </div>
      </div>

      {pubkey ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: 11, color: ink, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Wallet size={13} strokeWidth={2} />
            {name.trim() || shortPk(pubkey)}
          </span>
          <span className="mono" style={{ fontSize: 9, color: mute }} title={pubkey}>
            {shortPk(pubkey)}
          </span>
          <button type="button" onClick={() => void disconnect()} disabled={busy} style={{ ...ghostBtn, marginLeft: "auto" }}>
            <Unplug size={12} strokeWidth={2} />
            Disconnect
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void connect()}
          disabled={busy}
          style={{
            ...ghostBtn,
            color: ink,
            width: "100%",
            padding: "10px 14px",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <Wallet size={14} strokeWidth={2} />
          {busy ? "Signing…" : "Connect"}
        </button>
      )}

      {err && (
        <p className="mono" style={{ fontSize: 9, color: "var(--bad, #ff8a9a)", margin: 0, lineHeight: 1.4 }}>
          {err}
        </p>
      )}
    </div>
  );
}
