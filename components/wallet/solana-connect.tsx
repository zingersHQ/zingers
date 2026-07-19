"use client";
// Optional Phantom connect — Trainer sigil on Solana (docs/flight-first-plan.md).
// Never required to play. Sign-in only; no spend / no token UI.
import { useCallback, useEffect, useState } from "react";
import { Link2, Unplug, Wallet } from "lucide-react";
import bs58 from "bs58";
import { STORAGE } from "@/lib/brand";
import { getOwnerToken } from "@/lib/owner";
import { track as pingEvent } from "@/lib/track";

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: { toBase58(): string };
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array, display?: "utf8" | "hex"): Promise<{ signature: Uint8Array }>;
};

function getPhantom(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { solana?: PhantomProvider; phantom?: { solana?: PhantomProvider } };
  const p = w.solana?.isPhantom ? w.solana : w.phantom?.solana;
  return p ?? null;
}

function shortPk(pk: string) {
  return pk.length > 10 ? `${pk.slice(0, 4)}…${pk.slice(-4)}` : pk;
}

export function SolanaConnect({ compact = false }: { compact?: boolean }) {
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hasPhantom, setHasPhantom] = useState(false);

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
    } catch {
      /* keep local */
    }
  }, []);

  useEffect(() => {
    setHasPhantom(!!getPhantom());
    void hydrate();
  }, [hydrate]);

  const connect = useCallback(async () => {
    setErr(null);
    const phantom = getPhantom();
    if (!phantom) {
      setErr("Install Phantom to connect a Solana Trainer sigil.");
      window.open("https://phantom.app/", "_blank", "noopener,noreferrer");
      return;
    }
    const token = getOwnerToken();
    if (!token) {
      setErr("No Trainer code on this device.");
      return;
    }
    setBusy(true);
    try {
      const nr = await fetch(`/api/solana-link?token=${encodeURIComponent(token)}&nonce=1`);
      const nj = (await nr.json()) as { message?: string; error?: string };
      if (!nr.ok || !nj.message) throw new Error(nj.error || "Could not start link.");

      await phantom.connect();
      const pk = phantom.publicKey?.toBase58();
      if (!pk) throw new Error("Wallet did not return a public key.");

      const encoded = new TextEncoder().encode(nj.message);
      const { signature } = await phantom.signMessage(encoded, "utf8");
      const sigB58 = bs58.encode(signature);

      const pr = await fetch("/api/solana-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, pubkey: pk, signature: sigB58, message: nj.message }),
      });
      const pj = (await pr.json()) as { ok?: boolean; pubkey?: string; error?: string };
      if (!pr.ok || !pj.pubkey) throw new Error(pj.error || "Link failed.");

      setPubkey(pj.pubkey);
      localStorage.setItem(STORAGE.solPubkey, pj.pubkey);
      pingEvent("sol_link");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Connect cancelled.");
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setErr(null);
    const token = getOwnerToken();
    setBusy(true);
    try {
      if (token) {
        await fetch(`/api/solana-link?token=${encodeURIComponent(token)}`, { method: "DELETE" });
      }
      try {
        await getPhantom()?.disconnect();
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
          borderRadius: 999,
          border: "1px solid rgba(153,69,255,.35)",
          background: "rgba(153,69,255,.12)",
          color: "#e6d5ff",
          fontSize: 10,
          letterSpacing: 0.4,
        }}
      >
        <Wallet size={11} strokeWidth={2.2} />
        {shortPk(pubkey)}
      </div>
    );
  }

  return (
    <div
      className="panel"
      style={{
        ["--ac" as string]: "#9945FF",
        padding: compact ? 12 : 14,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: "#9945FF" }}>
        SOLANA TRAINER SIGIL
      </div>
      <p className="mono" style={{ fontSize: 9, color: "var(--muted2)", lineHeight: 1.45, margin: 0 }}>
        Optional. Prove a Phantom wallet is you — never required to fly, claim, or earn Crowns. No spend.
      </p>
      {pubkey ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <code className="mono" style={{ fontSize: 11, color: "#e6d5ff", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
            {shortPk(pubkey)}
          </code>
          <button
            type="button"
            onClick={() => void disconnect()}
            disabled={busy}
            className="mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 10,
              padding: "7px 10px",
              borderRadius: 8,
              border: "1px solid var(--line2)",
              background: "transparent",
              color: "var(--muted)",
              cursor: busy ? "wait" : "pointer",
            }}
          >
            <Unplug size={12} strokeWidth={2.2} /> Unlink
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void connect()}
          disabled={busy}
          className="btn"
          style={{
            ["--ac" as string]: "#9945FF",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            fontSize: 12,
            fontWeight: 700,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          <Link2 size={14} strokeWidth={2.4} />
          {busy ? "Signing…" : hasPhantom ? "Connect Phantom" : "Get Phantom / Connect"}
        </button>
      )}
      {err && (
        <p className="mono" style={{ fontSize: 9, color: "#ff8a9a", margin: 0, lineHeight: 1.4 }}>
          {err}
        </p>
      )}
    </div>
  );
}
