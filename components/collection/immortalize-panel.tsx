"use client";
// Immortalize CTA — attested seal or CARS chain burn+mint.
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import bs58 from "bs58";
import { Transaction } from "@solana/web3.js";
import { Sparkles } from "lucide-react";
import type { ImmortalStatus } from "@/lib/immortalize";
import {
  broadcastImmortalTx,
  confirmImmortalClient,
  fetchImmortalStatus,
  prepareImmortalTx,
  requestImmortalVoucher,
} from "@/lib/immortalize-client";
import { SolanaConnect } from "@/components/wallet/solana-connect";

type WalletProvider = {
  publicKey?: { toBase58(): string };
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  signMessage(message: Uint8Array, display?: "utf8" | "hex"): Promise<{ signature: Uint8Array }>;
  signTransaction?(transaction: Transaction): Promise<Transaction>;
};

function getWallet(): WalletProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    solana?: WalletProvider & { isPhantom?: boolean };
    phantom?: { solana?: WalletProvider };
  };
  if (w.solana && typeof w.solana.signMessage === "function") return w.solana;
  if (w.phantom?.solana && typeof w.phantom.solana.signMessage === "function") return w.phantom.solana;
  return null;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

async function sendPreparedTx(wallet: WalletProvider, txBase64: string): Promise<string> {
  if (typeof wallet.signTransaction !== "function") {
    throw new Error("Wallet cannot sign transactions.");
  }
  const tx = Transaction.from(b64ToBytes(txBase64));
  const signed = await wallet.signTransaction(tx);
  const sent = await broadcastImmortalTx(bytesToB64(signed.serialize()));
  if (!sent.ok) throw new Error(sent.error);
  return sent.signature;
}

export function ImmortalizePanel({
  mindKey,
  owned,
  accent,
}: {
  mindKey: string;
  owned: boolean;
  accent: string;
}) {
  const t = useTranslations("immortalize");
  const [status, setStatus] = useState<ImmortalStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [doneNote, setDoneNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!owned) {
      setStatus(null);
      return;
    }
    const s = await fetchImmortalStatus(mindKey);
    setStatus(s);
  }, [mindKey, owned]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mapErr = useCallback(
    (code: string) => {
      const keys = [
        "off",
        "unknown_mind",
        "no_wallet",
        "not_owner",
        "already",
        "full",
        "not_eligible",
        "voucher_expired",
        "voucher_mismatch",
        "voucher_invalid",
        "wallet_unlinked",
        "message_mismatch",
        "sig_invalid",
        "need_tx",
        "program_missing",
        "program_not_live",
        "no_fuel_ata",
        "insufficient_fuel",
        "prepare_missing",
        "tx_failed",
        "burn_mismatch",
        "mint_mismatch",
      ] as const;
      if ((keys as readonly string[]).includes(code)) {
        return t(`err_${code}` as "err_off");
      }
      return code;
    },
    [t],
  );

  const seal = useCallback(async () => {
    setErr(null);
    setDoneNote(null);
    if (!status?.eligible) return;
    const wallet = getWallet();
    if (!wallet) {
      setErr(t("err_no_wallet"));
      return;
    }
    setBusy(true);
    try {
      const v = await requestImmortalVoucher(mindKey);
      if (!v.ok) {
        setErr(mapErr(v.error));
        return;
      }
      await wallet.connect();
      const signed = await wallet.signMessage(new TextEncoder().encode(v.message), "utf8");
      const signature = bs58.encode(signed.signature);

      let txSig: string | undefined;
      if (status.mode === "chain") {
        if (!status.chainReady) {
          setErr(t("err_program_missing"));
          return;
        }
        const prepared = await prepareImmortalTx({
          voucherId: v.voucher.id,
          signature,
          message: v.message,
        });
        if (!prepared.ok) {
          setErr(mapErr(prepared.error));
          return;
        }
        txSig = await sendPreparedTx(wallet, prepared.txBase64);
      }

      const confirmed = await confirmImmortalClient({
        voucherId: v.voucher.id,
        signature,
        message: v.message,
        txSig,
      });
      if (!confirmed.ok) {
        setErr(mapErr(confirmed.error));
        return;
      }
      setDoneNote(
        confirmed.record.genesis
          ? t("sealedGenesis", { index: confirmed.record.mintIndex, cap: status.mindCap })
          : t("sealed", { index: confirmed.record.mintIndex, cap: status.mindCap }),
      );
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("failed"));
    } finally {
      setBusy(false);
    }
  }, [mapErr, mindKey, refresh, status, t]);

  if (!owned) return null;
  if (!status) {
    return (
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
        <p className="mono" style={{ fontSize: 11, color: "var(--muted2)", margin: 0 }}>
          {t("loading")}
        </p>
      </div>
    );
  }

  if (status.mode === "off") return null;

  const record = status.record;
  const fuel = status.fuelSymbol || "CARS";

  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: accent, marginBottom: 8 }}>
        {t("eyebrow")}
      </div>

      {record ? (
        <>
          <p style={{ fontSize: 14, color: "var(--ink)", margin: "0 0 6px", lineHeight: 1.45 }}>
            {record.genesis ? t("immortalGenesis") : t("immortal")}
          </p>
          <p className="mono" style={{ fontSize: 11, color: "var(--muted2)", margin: 0, wordBreak: "break-all" }}>
            {record.mintId}
            {" · "}
            {t("slot", { index: record.mintIndex, cap: status.mindCap })}
            {record.genesis ? ` · ${t("genesisMark")}` : ""}
            {record.txSig ? ` · ${record.chain}` : ""}
          </p>
        </>
      ) : (
        <>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 10px", lineHeight: 1.5 }}>
            {t("blurb", {
              burn: status.burnAmount,
              fuel,
              minted: status.mindMinted,
              cap: status.mindCap,
            })}
          </p>
          {status.mode === "attested" && (
            <p className="mono" style={{ fontSize: 11, color: "var(--muted2)", margin: "0 0 10px", lineHeight: 1.45 }}>
              {t("attestedNote")}
            </p>
          )}
          {status.mode === "chain" && (
            <p className="mono" style={{ fontSize: 11, color: "var(--muted2)", margin: "0 0 10px", lineHeight: 1.45 }}>
              {status.chainReady
                ? t("chainNote", { fuel })
                : t("err_program_missing")}
              {status.programId ? ` · ${status.programId.slice(0, 8)}…` : ""}
            </p>
          )}
          {status.genesis && (
            <p className="mono" style={{ fontSize: 11, color: "var(--gold)", margin: "0 0 10px" }}>
              {t("genesisWindow")}
            </p>
          )}
          {!status.walletLinked && (
            <div style={{ marginBottom: 12 }}>
              <SolanaConnect compact onIdentity={() => void refresh()} />
            </div>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !status.eligible || (status.mode === "chain" && !status.chainReady)}
            onClick={() => void seal()}
            style={{ ["--ac" as string]: accent, display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <Sparkles size={14} />
            {busy ? t("sealing") : t("cta", { burn: status.burnAmount, fuel })}
          </button>
          {status.reason && !status.eligible && (
            <p style={{ fontSize: 12, color: "var(--muted2)", margin: "10px 0 0", lineHeight: 1.45 }}>
              {mapErr(status.reason)}
            </p>
          )}
        </>
      )}

      {doneNote && (
        <p style={{ fontSize: 13, color: "var(--gold)", margin: "10px 0 0", lineHeight: 1.45 }}>{doneNote}</p>
      )}
      {err && (
        <p style={{ fontSize: 12, color: "var(--danger, #c44)", margin: "10px 0 0", lineHeight: 1.45 }}>{err}</p>
      )}
    </div>
  );
}
