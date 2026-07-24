// Short climb challenge shares — POST to mint /ascent/<id>, GET to resolve.
import { NextRequest, NextResponse } from "next/server";
import { createClimbShare, getClimbShare, isValidShareId } from "@/lib/server/climb-share";
import { rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "climb-share-get", 60, 60_000);
  if (limited) return limited;

  const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";
  if (!isValidShareId(id)) return bad("Missing id.");
  const challenge = await getClimbShare(id);
  if (!challenge) return bad("Not found.", 404);
  return NextResponse.json({ ok: true, challenge });
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "climb-share", 20, 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON.");
  }

  const result = await createClimbShare(body);
  if ("error" in result) return bad(result.error);

  // Client builds absolute URL from its origin (localhost / preview / prod).
  return NextResponse.json({ ok: true, id: result.id, path: `/ascent/${result.id}` });
}
