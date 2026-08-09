// Immortalize API — status, voucher, prepare (chain tx), confirm.
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/server/rate-limit";
import {
  confirmImmortalize,
  immortalStatus,
  issueImmortalVoucher,
  prepareImmortalizeTx,
} from "@/lib/server/immortalize";
import { broadcastSignedTx } from "@/lib/server/card-program";

export const runtime = "nodejs";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function tokenOf(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "immortalize", 60, 60_000);
  if (limited) return limited;

  const token = tokenOf(req.nextUrl.searchParams.get("token"));
  const mind = (req.nextUrl.searchParams.get("mind") || "").trim().toUpperCase();
  if (token.length < 8 || token.length > 128) return bad("Missing token.");
  if (!mind || mind.length > 32) return bad("Missing mind.");

  const status = await immortalStatus(token, mind);
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "immortalize-write", 20, 60_000);
  if (limited) return limited;

  let body: {
    action?: string;
    token?: string;
    mind?: string;
    voucherId?: string;
    signature?: string;
    message?: string;
    txSig?: string;
    txBase64?: string;
  };
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON.");
  }

  const token = tokenOf(body.token);
  if (token.length < 8 || token.length > 128) return bad("Missing token.");
  const action = typeof body.action === "string" ? body.action.trim() : "";

  if (action === "voucher") {
    const mind = typeof body.mind === "string" ? body.mind.trim() : "";
    if (!mind) return bad("Missing mind.");
    const result = await issueImmortalVoucher(token, mind);
    if (!result.ok) return bad(result.error, 409);
    return NextResponse.json({
      ok: true,
      voucher: result.voucher,
      message: result.message,
    });
  }

  if (action === "prepare") {
    const voucherId = typeof body.voucherId === "string" ? body.voucherId.trim() : "";
    const signature = typeof body.signature === "string" ? body.signature.trim() : "";
    const message = typeof body.message === "string" ? body.message : "";
    if (!voucherId || !signature || !message) return bad("Missing prepare fields.");
    const result = await prepareImmortalizeTx({
      ownerToken: token,
      voucherId,
      signature,
      message,
    });
    if (!result.ok) return bad(result.error, 409);
    return NextResponse.json(result);
  }

  if (action === "broadcast") {
    // Wallet signs client-side; we submit via server SOLANA_RPC_URL (never NEXT_PUBLIC).
    const txBase64 = typeof body.txBase64 === "string" ? body.txBase64.trim() : "";
    if (!txBase64) return bad("Missing tx.");
    const result = await broadcastSignedTx(txBase64);
    if (!result.ok) return bad(result.error, 409);
    return NextResponse.json({ ok: true, signature: result.signature });
  }

  if (action === "confirm") {
    const voucherId = typeof body.voucherId === "string" ? body.voucherId.trim() : "";
    const signature = typeof body.signature === "string" ? body.signature.trim() : "";
    const message = typeof body.message === "string" ? body.message : "";
    if (!voucherId || !signature || !message) return bad("Missing confirm fields.");
    const result = await confirmImmortalize({
      ownerToken: token,
      voucherId,
      signature,
      message,
      txSig: typeof body.txSig === "string" ? body.txSig : undefined,
    });
    if (!result.ok) return bad(result.error, 409);
    return NextResponse.json({ ok: true, record: result.record });
  }

  return bad("Unknown action.");
}
