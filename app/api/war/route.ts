// The season's Force war standings + current leader. Read-only; the tally is
// written only by the server off engine-decided ranked bouts (lib/server/war.ts).
// When an owner token is supplied, the Reader's own authoritative contribution
// (`mine`) is included so the UI never has to trust a forgeable client mirror.
import { getWarState, getMyWar } from "@/lib/server/war";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const war = await getWarState();
  const token = new URL(req.url).searchParams.get("token");
  if (token) war.mine = await getMyWar(token);
  return Response.json(war);
}
