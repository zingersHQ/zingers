"use client";
// Frictionless identity & recovery. There is no login — the unguessable owner
// token IS your account. This panel lets a trainer (1) reveal + copy their code
// so a cache wipe can't erase a legend, and (2) paste a code from another device
// to adopt that save here. Play is never gated behind any of this.
import { useEffect, useState } from "react";
import { getOwnerToken, setOwnerToken } from "@/lib/owner";

const ACC = "#7c5cff";

export function TrainerCode() {
  const [token, setToken] = useState("");
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [adopt, setAdopt] = useState("");

  useEffect(() => {
    setToken(getOwnerToken());
  }, []);

  const masked = token ? `${token.slice(0, 4)}····${token.slice(-4)}` : "—";

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setReveal(true); // clipboard blocked — at least show it to copy by hand
    }
  };

  const useCode = () => {
    const next = setOwnerToken(adopt);
    if (next) window.location.reload(); // reload re-hydrates the store from the adopted save
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#100e1a",
    border: "1px solid var(--line2)",
    borderRadius: 8,
    color: "var(--ink)",
    padding: "8px 10px",
    fontFamily: "var(--font-mono), monospace",
    fontSize: 12,
  };

  return (
    <div className="panel" style={{ ["--ac" as string]: ACC, padding: 16 }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: 2, color: ACC, marginBottom: 4 }}>YOUR TRAINER CODE</div>
      <p className="mono" style={{ fontSize: 9, color: "var(--muted2)", lineHeight: 1.5, margin: "0 0 10px" }}>
        No login — this code is your account. Save it to keep your legend across devices or a cache wipe.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <code style={{ ...inputStyle, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {reveal ? token || "—" : masked}
        </code>
        <button onClick={() => setReveal((v) => !v)} className="mono" style={{ fontSize: 10, background: "none", border: "1px solid var(--line2)", borderRadius: 8, color: "var(--muted)", padding: "8px 10px", cursor: "pointer" }}>
          {reveal ? "hide" : "show"}
        </button>
        <button onClick={copy} className="btn btn-primary" style={{ ["--ac" as string]: ACC, fontSize: 11, padding: "8px 12px" }}>
          {copied ? "copied" : "copy"}
        </button>
      </div>

      <details style={{ marginTop: 12 }}>
        <summary className="mono" style={{ fontSize: 10, color: "var(--muted)", cursor: "pointer" }}>
          Have a code from another device?
        </summary>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input value={adopt} onChange={(e) => setAdopt(e.target.value)} placeholder="paste trainer code" style={inputStyle} />
          <button onClick={useCode} disabled={adopt.trim().length < 8} className="mono" style={{ fontSize: 10, background: "none", border: `1px solid ${adopt.trim().length < 8 ? "var(--line2)" : ACC}`, borderRadius: 8, color: adopt.trim().length < 8 ? "var(--muted2)" : ACC, padding: "8px 12px", cursor: adopt.trim().length < 8 ? "default" : "pointer", whiteSpace: "nowrap" }}>
            use it
          </button>
        </div>
        <p className="mono" style={{ fontSize: 9, color: "var(--muted2)", lineHeight: 1.4, margin: "8px 0 0" }}>
          Adopting a code replaces this device&apos;s save with that trainer&apos;s — the page will reload.
        </p>
      </details>
    </div>
  );
}
