"use client";
// Optional wallet identity — restores career across devices. Sign-only.
// Trainers stay nameless; champions get Ubuntu-style names on the board.
import { useCallback, useEffect, useState } from "react";
import { Unplug, Wallet } from "lucide-react";
import bs58 from "bs58";
import { STORAGE } from "@/lib/brand";
import { getOwnerToken, setOwnerToken } from "@/lib/owner";
import { shortPubkey } from "@/lib/trainer-label";
import { track as pingEvent } from "@/lib/track";

type WalletProvider = {
  publicKey?: { toBase58(): string };
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array, display?: "utf8" | "hex"): Promise<{ signature: Uint8Array }>;
};

const PHANTOM_DOWNLOAD = "https://phantom.app/download";

function getWallet(): WalletProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { solana?: WalletProvider & { isPhantom?: boolean }; phantom?: { solana?: WalletProvider } };
  if (w.solana && typeof w.solana.signMessage === "function") return w.solana;
  if (w.phantom?.solana && typeof w.phantom.solana.signMessage === "function") return w.phantom.solana;
  return null;
}

function noWalletHint(): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const mobile = /iPhone|iPad|iPod|Android/i.test(ua);
  if (mobile) {
    return "No wallet in this browser. Open zingers.gg inside a Solana wallet app, or connect on desktop.";
  }
  return "No wallet found. Install a Solana wallet extension, then reload.";
}

const ink = "var(--ink)";
const mute = "var(--muted2)";
const line = "var(--line2)";

export function SolanaConnect({
  compact = false,
  /** Hub: shorter copy, stronger connect CTA (still optional). */
  tone = "default",
  onIdentity,
}: {
  compact?: boolean;
  tone?: "default" | "hub";
  /** Fired after link/restore (name always null — Trainers are nameless). */
  onIdentity?: (name: string | null) => void;
}) {
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const hydrate = useCallback(async () => {
    const token = getOwnerToken();
    if (!token) return;
    try {
      const local = localStorage.getItem(STORAGE.solPubkey);
      if (local) setPubkey(local);
      const r = await fetch(`/api/solana-link?token=${encodeURIComponent(token)}`);
      const j = (await r.json()) as { pubkey?: string | null };
      if (j.pubkey) {
        setPubkey(j.pubkey);
        localStorage.setItem(STORAGE.solPubkey, j.pubkey);
      } else {
        setPubkey(null);
        localStorage.removeItem(STORAGE.solPubkey);
      }
      onIdentity?.(null);
    } catch {
      /* keep local */
    }
  }, [onIdentity]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const connect = useCallback(async () => {
    setErr(null);
    const wallet = getWallet();
    if (!wallet) {
      setErr(noWalletHint());
      pingEvent("sol_link_no_wallet");
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
        }),
      });
      const pj = (await pr.json()) as {
        ok?: boolean;
        pubkey?: string;
        ownerToken?: string;
        restored?: boolean;
        error?: string;
      };
      if (!pr.ok || !pj.pubkey) throw new Error(pj.error || "Could not link.");

      if (pj.ownerToken && pj.ownerToken !== token) {
        const adopted = setOwnerToken(pj.ownerToken);
        if (adopted) {
          if (pj.pubkey) localStorage.setItem(STORAGE.solPubkey, pj.pubkey);
          pingEvent(pj.restored ? "sol_restore" : "sol_link");
          window.location.reload();
          return;
        }
      }

      setPubkey(pj.pubkey);
      localStorage.setItem(STORAGE.solPubkey, pj.pubkey);
      onIdentity?.(null);
      pingEvent(pj.restored ? "sol_restore" : "sol_link");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cancelled.");
    } finally {
      setBusy(false);
    }
  }, [onIdentity]);

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
        title={pubkey}
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
        {shortPubkey(pubkey)}
      </div>
    );
  }

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

  const hub = tone === "hub";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: hub ? 8 : 10 }}>
      {!hub && (
        <p className="mono" style={{ fontSize: 9, color: mute, lineHeight: 1.45, margin: 0 }}>
          Optional wallet. Reconnect restores champions, Crowns, and Flight progress. Keep a recovery code as backup.
        </p>
      )}

      {pubkey ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: 11, color: ink, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Wallet size={13} strokeWidth={2} />
            linked
          </span>
          <span className="mono" style={{ fontSize: 9, color: mute }} title={pubkey}>
            {shortPubkey(pubkey)}
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
          className={hub ? "btn btn-primary" : undefined}
          style={
            hub
              ? {
                  ["--ac" as string]: "#7c5cff",
                  width: "100%",
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }
              : {
                  ...ghostBtn,
                  color: ink,
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                }
          }
        >
          <Wallet size={14} strokeWidth={2} />
          {busy ? "Signing…" : "Connect wallet"}
        </button>
      )}
      {hub && !pubkey && (
        <p className="mono" style={{ fontSize: 9, color: mute, lineHeight: 1.4, margin: 0 }}>
          Optional. Same wallet restores this Trainer on another device.
        </p>
      )}

      {err && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p className="mono" style={{ fontSize: 9, color: "var(--bad, #ff8a9a)", margin: 0, lineHeight: 1.4 }}>
            {err}
          </p>
          {!pubkey && err.includes("No wallet") && (
            <a
              href={PHANTOM_DOWNLOAD}
              target="_blank"
              rel="noopener noreferrer"
              className="mono"
              style={{ fontSize: 10, color: "var(--accent, #7c5cff)", textDecoration: "underline" }}
            >
              Get a Solana wallet →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
