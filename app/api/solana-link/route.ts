// Optional Trainer identity link — bind a browser wallet to the device owner
// token and claim a unique display name on that key. Never gates play; never spends.
import { NextRequest, NextResponse } from "next/server";
import {
  checkTrainerName,
  issueNonce,
  linkedIdentity,
  setLinkedName,
  unlinkWallet,
  verifyAndLink,
} from "@/lib/server/solana-link";
import { rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "solana-link", 60, 60_000);
  if (limited) return limited;

  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  const check = req.nextUrl.searchParams.get("check");

  // Availability probe — token optional (needed to report "yours").
  if (check != null) {
    if (token && (token.length < 8 || token.length > 128)) return bad("Missing token.");
    const result = await checkTrainerName(check, token || undefined);
    return NextResponse.json(result);
  }

  if (token.length < 8 || token.length > 128) return bad("Missing token.");

  const want = req.nextUrl.searchParams.get("nonce");
  if (want === "1") {
    const { nonce, message } = await issueNonce(token);
    return NextResponse.json({ nonce, message });
  }

  const { pubkey, name } = await linkedIdentity(token);
  return NextResponse.json({ pubkey, name });
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "solana-link", 20, 60_000);
  if (limited) return limited;

  let body: { token?: string; pubkey?: string; signature?: string; message?: string; name?: string };
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
  if (!pubkey || !signature || !message) return bad("Missing signature fields.");

  const result = await verifyAndLink({
    ownerToken: token,
    pubkey,
    signature,
    message,
    name: body.name,
  });
  if (!result.ok) return bad(result.error, 401);
  return NextResponse.json({
    ok: true,
    pubkey: result.pubkey,
    name: result.name,
    nameError: result.nameError,
  });
}

/** Claim / update the unique Trainer name on an already-linked key. */
export async function PATCH(req: NextRequest) {
  const limited = rateLimit(req, "solana-link", 30, 60_000);
  if (limited) return limited;

  let body: { token?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON.");
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (token.length < 8 || token.length > 128) return bad("Missing token.");

  const result = await setLinkedName(token, body.name ?? "");
  if (!result.ok) {
    const status = result.error.startsWith("Connect") ? 409 : result.error === "Name taken." ? 409 : 400;
    return bad(result.error, status);
  }
  return NextResponse.json({ ok: true, name: result.name });
}

export async function DELETE(req: NextRequest) {
  const limited = rateLimit(req, "solana-link", 20, 60_000);
  if (limited) return limited;

  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (token.length < 8 || token.length > 128) return bad("Missing token.");
  await unlinkWallet(token);
  return NextResponse.json({ ok: true });
}
