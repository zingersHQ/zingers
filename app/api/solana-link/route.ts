// Optional Solana Trainer sigil — link a Phantom wallet to the device owner
// token (docs/flight-first-plan.md). Identity only; never gates play.
import { NextRequest, NextResponse } from "next/server";
import { issueNonce, linkedPubkey, unlinkWallet, verifyAndLink } from "@/lib/server/solana-link";

export const runtime = "nodejs";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (token.length < 8 || token.length > 128) return bad("Missing token.");

  const want = req.nextUrl.searchParams.get("nonce");
  if (want === "1") {
    const { nonce, message } = await issueNonce(token);
    return NextResponse.json({ nonce, message });
  }

  const pubkey = await linkedPubkey(token);
  return NextResponse.json({ pubkey });
}

export async function POST(req: NextRequest) {
  let body: { token?: string; pubkey?: string; signature?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON.");
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const pubkey = typeof body.pubkey === "string" ? body.pubkey.trim() : "";
  const signature = typeof body.signature === "string" ? body.signature.trim() : "";
  const message = typeof body.message === "string" ? body.message : "";
  if (token.length < 8 || token.length > 128) return bad("Missing token.");
  if (!pubkey || !signature || !message) return bad("Missing pubkey, signature, or message.");

  const result = await verifyAndLink({ ownerToken: token, pubkey, signature, message });
  if (!result.ok) return bad(result.error, 401);
  return NextResponse.json({ ok: true, pubkey: result.pubkey });
}

export async function DELETE(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (token.length < 8 || token.length > 128) return bad("Missing token.");
  await unlinkWallet(token);
  return NextResponse.json({ ok: true });
}
